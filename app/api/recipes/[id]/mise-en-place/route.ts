import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById } from '@/lib/db';
import { buildMisePlan, type MisePlan } from '@/lib/ai/mise-en-place';
import { scaleIngredient } from '@/lib/scale-ingredient';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit';

// Per-instance cache so re-opening cook mode for the same recipe doesn't
// burn another AI call. Keyed by recipe id + scale + last update time.
const cache = new Map<string, MisePlan>();
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

    const rawScale = parseFloat(request.nextUrl.searchParams.get('scale') ?? '1');
    const scale = Number.isFinite(rawScale) ? Math.min(4, Math.max(0.25, rawScale)) : 1;

    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const cacheKey = `${recipeId}:${scale}:${recipe.updated_at ?? ''}`;
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

    const ingredients =
      scale === 1
        ? recipe.ingredients
        : recipe.ingredients.map((ing) => scaleIngredient(ing, scale));

    const plan = await buildMisePlan(recipe.name, ingredients, recipe.instructions);

    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(cacheKey, plan);

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error building mise en place:', error);
    return NextResponse.json({ error: 'Failed to build mise en place' }, { status: 500 });
  }
}
