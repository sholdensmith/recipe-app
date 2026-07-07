import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeWithClaude, convertParsedToRecipe, MAX_RECIPE_TEXT_LENGTH } from '@/lib/ai/parse-recipe';
import { insertRecipe } from '@/lib/db';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(request, 'ai', AI_RATE_LIMIT);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const { rawText, saveToDb } = await request.json();

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid rawText field' },
        { status: 400 }
      );
    }

    if (rawText.length > MAX_RECIPE_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Recipe text is too long (max ${MAX_RECIPE_TEXT_LENGTH.toLocaleString()} characters). Try trimming it to just the recipe.` },
        { status: 400 }
      );
    }

    // Parse the recipe using Claude
    const parsed = await parseRecipeWithClaude(rawText);

    // Optionally save to database
    if (saveToDb) {
      const recipe = await convertParsedToRecipe(parsed, rawText);
      const id = await insertRecipe(recipe);
      return NextResponse.json({ ...parsed, id, saved: true });
    }

    return NextResponse.json({ ...parsed, saved: false });
  } catch (error) {
    console.error('Error parsing recipe:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse recipe' },
      { status: 500 }
    );
  }
}
