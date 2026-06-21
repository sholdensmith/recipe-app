import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAllRecipes, Recipe } from '@/lib/db';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'recipe';
}

function recipeToMarkdown(recipe: Recipe): string {
  const lines: string[] = [];
  lines.push(`# ${recipe.name}`);
  lines.push('');

  if (recipe.description) {
    lines.push(recipe.description);
    lines.push('');
  }

  const meta: string[] = [];
  if (recipe.author) meta.push(`- **Author:** ${recipe.author}`);
  if (recipe.recipe_category) meta.push(`- **Category:** ${recipe.recipe_category}`);
  if (recipe.recipe_cuisine) meta.push(`- **Cuisine:** ${recipe.recipe_cuisine}`);
  if (recipe.prep_time) meta.push(`- **Prep time:** ${recipe.prep_time} min`);
  if (recipe.cook_time) meta.push(`- **Cook time:** ${recipe.cook_time} min`);
  if (recipe.total_time) meta.push(`- **Total time:** ${recipe.total_time} min`);
  if (recipe.servings) meta.push(`- **Servings:** ${recipe.servings}`);
  if (recipe.recipe_yield) meta.push(`- **Yield:** ${recipe.recipe_yield}`);
  if (recipe.is_favorite) meta.push(`- **Bookmarked:** 🔖`);
  if (recipe.is_fan_favorite) meta.push(`- **Fan Favorite:** ⭐`);
  if (recipe.source_url) meta.push(`- **Source:** ${recipe.source_url}`);
  if (meta.length) {
    lines.push(...meta);
    lines.push('');
  }

  if (recipe.ingredients?.length) {
    lines.push('## Ingredients');
    lines.push('');
    for (const ing of recipe.ingredients) lines.push(`- ${ing}`);
    lines.push('');
  }

  if (recipe.instructions?.length) {
    lines.push('## Instructions');
    lines.push('');
    recipe.instructions.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('');
  }

  if (recipe.notes) {
    lines.push('## Notes');
    lines.push('');
    lines.push(recipe.notes);
    lines.push('');
  }

  return lines.join('\n');
}

export async function GET() {
  try {
    const recipes = await getAllRecipes();
    const zip = new JSZip();

    const usedNames = new Map<string, number>();
    for (const recipe of recipes) {
      const base = slugify(recipe.name);
      const count = usedNames.get(base) ?? 0;
      usedNames.set(base, count + 1);
      const filename = count === 0 ? `${base}.md` : `${base}-${count + 1}.md`;
      zip.file(filename, recipeToMarkdown(recipe));
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="recipes-${date}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error exporting recipes:', error);
    return NextResponse.json({ error: 'Failed to export recipes' }, { status: 500 });
  }
}
