import { describe, it, expect } from 'vitest';
import {
  isoDurationToMinutes,
  extractRecipeFromJsonLd,
  htmlToText,
  isAllowedImportUrl,
  findRecipeNode,
} from '../lib/import-url';

describe('isoDurationToMinutes', () => {
  it('parses hour and minute durations', () => {
    expect(isoDurationToMinutes('PT30M')).toBe(30);
    expect(isoDurationToMinutes('PT1H')).toBe(60);
    expect(isoDurationToMinutes('PT1H30M')).toBe(90);
  });

  it('handles days and seconds', () => {
    expect(isoDurationToMinutes('P1D')).toBe(1440);
    expect(isoDurationToMinutes('PT90S')).toBe(2);
  });

  it('rejects non-durations', () => {
    expect(isoDurationToMinutes('30 minutes')).toBeUndefined();
    expect(isoDurationToMinutes(30)).toBeUndefined();
    expect(isoDurationToMinutes(null)).toBeUndefined();
  });
});

describe('findRecipeNode', () => {
  it('finds a recipe in an @graph', () => {
    const data = {
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'WebPage' }, { '@type': 'Recipe', name: 'Brownies' }],
    };
    expect(findRecipeNode(data)?.name).toBe('Brownies');
  });

  it('handles array @type', () => {
    const data = { '@type': ['Recipe', 'NewsArticle'], name: 'Brownies' };
    expect(findRecipeNode(data)?.name).toBe('Brownies');
  });

  it('returns null when there is no recipe', () => {
    expect(findRecipeNode({ '@type': 'WebSite' })).toBeNull();
  });
});

describe('extractRecipeFromJsonLd', () => {
  const recipeJson = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: 'Espresso Brownies',
    description: 'Fudgy brownies with a shot of espresso.',
    prepTime: 'PT15M',
    cookTime: 'PT35M',
    totalTime: 'PT50M',
    recipeYield: '16',
    recipeCategory: 'Dessert',
    recipeCuisine: 'American',
    image: ['https://example.com/brownies.jpg'],
    author: { '@type': 'Person', name: 'Jane Baker' },
    recipeIngredient: ['4 oz unsalted butter', '1 cup sugar', '2 large eggs'],
    recipeInstructions: [
      { '@type': 'HowToStep', text: 'Melt the butter.' },
      { '@type': 'HowToStep', text: 'Mix in sugar and eggs.' },
      { '@type': 'HowToStep', text: 'Bake at 350°F for 30 to 40 minutes.' },
    ],
  };

  function page(json: unknown) {
    return `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head><body></body></html>`;
  }

  it('extracts a complete recipe', () => {
    const recipe = extractRecipeFromJsonLd(page(recipeJson));
    expect(recipe).not.toBeNull();
    expect(recipe!.name).toBe('Espresso Brownies');
    expect(recipe!.prep_time).toBe(15);
    expect(recipe!.cook_time).toBe(35);
    expect(recipe!.total_time).toBe(50);
    expect(recipe!.servings).toBe('16');
    expect(recipe!.recipe_category).toBe('dessert');
    expect(recipe!.ingredients).toHaveLength(3);
    expect(recipe!.instructions).toEqual([
      'Melt the butter.',
      'Mix in sugar and eggs.',
      'Bake at 350°F for 30 to 40 minutes.',
    ]);
    expect(recipe!.image_url).toBe('https://example.com/brownies.jpg');
    expect(recipe!.author).toBe('Jane Baker');
  });

  it('handles HowToSection groupings', () => {
    const sectioned = {
      ...recipeJson,
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Batter',
          itemListElement: [{ '@type': 'HowToStep', text: 'Melt the butter.' }],
        },
      ],
    };
    const recipe = extractRecipeFromJsonLd(page(sectioned));
    expect(recipe!.instructions).toEqual(['Batter:', 'Melt the butter.']);
  });

  it('returns null when no JSON-LD recipe exists', () => {
    expect(extractRecipeFromJsonLd('<html><body><h1>Blog post</h1></body></html>')).toBeNull();
  });

  it('returns null for a recipe missing ingredients', () => {
    const incomplete = { ...recipeJson, recipeIngredient: [], ingredients: undefined };
    expect(extractRecipeFromJsonLd(page(incomplete))).toBeNull();
  });

  it('skips malformed JSON-LD blocks but keeps scanning', () => {
    const html = `<script type="application/ld+json">{not json}</script>${page(recipeJson)}`;
    expect(extractRecipeFromJsonLd(html)?.name).toBe('Espresso Brownies');
  });
});

describe('htmlToText', () => {
  it('strips tags, scripts, and decodes entities', () => {
    const html = '<html><script>var x = 1;</script><body><h1>Cookies &amp; Cream</h1><p>Use &frac12; cup.</p></body></html>';
    const text = htmlToText(html);
    expect(text).toContain('Cookies & Cream');
    expect(text).toContain('½ cup');
    expect(text).not.toContain('var x');
  });
});

describe('isAllowedImportUrl', () => {
  it('allows normal public URLs', () => {
    expect(isAllowedImportUrl('https://www.seriouseats.com/recipe')).toBe(true);
    expect(isAllowedImportUrl('http://example.com')).toBe(true);
  });

  it('blocks non-http protocols and bad URLs', () => {
    expect(isAllowedImportUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedImportUrl('ftp://example.com')).toBe(false);
    expect(isAllowedImportUrl('not a url')).toBe(false);
  });

  it('blocks localhost and private ranges', () => {
    expect(isAllowedImportUrl('http://localhost:3000')).toBe(false);
    expect(isAllowedImportUrl('http://127.0.0.1/admin')).toBe(false);
    expect(isAllowedImportUrl('http://10.0.0.5')).toBe(false);
    expect(isAllowedImportUrl('http://192.168.1.1')).toBe(false);
    expect(isAllowedImportUrl('http://172.20.0.1')).toBe(false);
    expect(isAllowedImportUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
  });
});
