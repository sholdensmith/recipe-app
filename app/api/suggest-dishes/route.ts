import { NextRequest, NextResponse } from 'next/server';
import { suggestComplementaryDishes } from '@/lib/ai/suggest-dishes';
import { getAllRecipes } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
