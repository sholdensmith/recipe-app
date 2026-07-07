import { describe, it, expect } from 'vitest';
import {
  recipeCreateSchema,
  recipePatchSchema,
  mealItemCreateSchema,
  parsedRecipeSchema,
} from '../lib/validation';
import { extractJson } from '../lib/ai/parse-recipe';
import { misePlanSchema } from '../lib/ai/mise-en-place';

describe('recipeCreateSchema', () => {
  const valid = {
    name: 'Brownies',
    ingredients: ['4 oz butter'],
    instructions: ['Melt the butter'],
  };

  it('accepts a minimal valid recipe', () => {
    expect(recipeCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing name', () => {
    expect(recipeCreateSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects empty ingredients', () => {
    expect(recipeCreateSchema.safeParse({ ...valid, ingredients: [] }).success).toBe(false);
  });

  it('rejects non-numeric times', () => {
    expect(recipeCreateSchema.safeParse({ ...valid, prep_time: 'fifteen' }).success).toBe(false);
  });
});

describe('recipePatchSchema', () => {
  it('accepts partial updates', () => {
    expect(recipePatchSchema.safeParse({ notes: 'Extra chocolate' }).success).toBe(true);
  });

  it('normalizes boolean favorites to 0/1', () => {
    const result = recipePatchSchema.safeParse({ is_favorite: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_favorite).toBe(1);
  });

  it('rejects empty updates', () => {
    expect(recipePatchSchema.safeParse({}).success).toBe(false);
  });
});

describe('mealItemCreateSchema', () => {
  it('requires recipe_id for recipe items', () => {
    expect(mealItemCreateSchema.safeParse({ item_type: 'recipe' }).success).toBe(false);
    expect(mealItemCreateSchema.safeParse({ item_type: 'recipe', recipe_id: 3 }).success).toBe(true);
  });

  it('requires a name for simple items', () => {
    expect(mealItemCreateSchema.safeParse({ item_type: 'simple' }).success).toBe(false);
    expect(
      mealItemCreateSchema.safeParse({ item_type: 'simple', simple_item_name: 'Baguette' }).success
    ).toBe(true);
  });
});

describe('parsedRecipeSchema', () => {
  it('coerces numeric servings to a string', () => {
    const result = parsedRecipeSchema.safeParse({
      name: 'Brownies',
      servings: 16,
      ingredients: ['butter'],
      instructions: ['bake'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.servings).toBe('16');
  });
});

describe('misePlanSchema', () => {
  it('accepts a valid plan', () => {
    const plan = {
      setup: ['Preheat oven to 350°F'],
      groups: [
        { title: 'Dry ingredients — one bowl (step 5)', items: ['Measure 1/2 cup flour'] },
      ],
    };
    expect(misePlanSchema.safeParse(plan).success).toBe(true);
  });

  it('rejects a plan with no groups', () => {
    expect(misePlanSchema.safeParse({ setup: [], groups: [] }).success).toBe(false);
  });

  it('rejects groups with empty items', () => {
    expect(
      misePlanSchema.safeParse({ setup: [], groups: [{ title: 'Bowl', items: [] }] }).success
    ).toBe(false);
  });
});

describe('extractJson', () => {
  const json = '{"name": "Brownies"}';

  it('passes through bare JSON', () => {
    expect(extractJson(json)).toBe(json);
  });

  it('strips ```json fences', () => {
    expect(extractJson('```json\n' + json + '\n```')).toBe(json);
  });

  it('strips bare ``` fences', () => {
    expect(extractJson('```\n' + json + '\n```')).toBe(json);
  });

  it('extracts JSON surrounded by prose', () => {
    expect(extractJson('Here is the recipe:\n' + json + '\nEnjoy!')).toBe(json);
  });
});
