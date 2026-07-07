import { NextRequest, NextResponse } from 'next/server';
import { suggestComplementaryDishes } from '@/lib/ai/suggest-dishes';
import { getAllRecipes, filterRecipes } from '@/lib/db';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit';

const MAX_MATCHES_PER_SUGGESTION = 3;

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(request, 'ai', AI_RATE_LIMIT);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const { currentItems, servings } = await request.json();

    if (!currentItems || !Array.isArray(currentItems)) {
      return NextResponse.json(
        { error: 'Missing or invalid currentItems array' },
        { status: 400 }
      );
    }

    const availableRecipes = await getAllRecipes();

    const suggestions = await suggestComplementaryDishes(
      { currentItems, servings },
      availableRecipes
    );

    const seedRecipeIds = new Set<number>();
    for (const item of currentItems) {
      if (item.type === 'recipe' && typeof item.id === 'number') {
        seedRecipeIds.add(item.id);
      }
    }

    const enriched = await Promise.all(
      suggestions.map(async (s) => {
        const query = (s.searchQuery || s.name || '').trim();
        if (!query) return { ...s, matches: [] };
        try {
          const found = await filterRecipes({ search: query });
          const matches = found
            .filter((r) => r.id !== undefined && !seedRecipeIds.has(r.id))
            .slice(0, MAX_MATCHES_PER_SUGGESTION);
          return { ...s, matches };
        } catch (err) {
          console.error('Error resolving suggestion match:', err);
          return { ...s, matches: [] };
        }
      })
    );

    return NextResponse.json({ suggestions: enriched });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
