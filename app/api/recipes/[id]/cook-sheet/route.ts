import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById } from '@/lib/db';
import { buildCookSheet, type CookSheetPlan } from '@/lib/ai/cook-sheet';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit';

// Per-instance cache so reopening the sheet doesn't burn another AI call.
// The tree is built from unscaled ingredients (scaling only changes the
// quantity text, not the merge structure), so scale isn't in the key.
const cache = new Map<string, CookSheetPlan>();
const CACHE_MAX = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipeId = parseInt(id, 10);
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: 'Invalid recipe ID' }, { status: 400 });
    }

    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
      return NextResponse.json(
        { error: 'Recipe needs ingredients and instructions to build a cook sheet' },
        { status: 422 }
      );
    }

    const cacheKey = `${recipeId}:${recipe.updated_at ?? ''}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const limit = checkRateLimit(request, 'ai', AI_RATE_LIMIT);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const plan = await buildCookSheet(recipe.name, recipe.ingredients, recipe.instructions);

    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(cacheKey, plan);

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error building cook sheet:', error);
    return NextResponse.json({ error: 'Failed to build cook sheet' }, { status: 500 });
  }
}
