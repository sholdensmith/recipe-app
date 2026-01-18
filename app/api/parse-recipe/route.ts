import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeWithClaude, convertParsedToRecipe } from '@/lib/ai/parse-recipe';
import { insertRecipe } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { rawText, saveToDb } = await request.json();

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid rawText field' },
        { status: 400 }
      );
    }

    // Debug: Check if API key is loaded
    console.log('CWD:', process.cwd());
    console.log('All env keys:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));
    console.log('ANTHROPIC_API_KEY value:', JSON.stringify(process.env.ANTHROPIC_API_KEY));
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length);
    console.log('ANTHROPIC_API_KEY first 20 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 20));

    // Parse the recipe using Claude
    const parsed = await parseRecipeWithClaude(rawText);

    // Optionally save to database
    if (saveToDb) {
      const recipe = await convertParsedToRecipe(parsed, rawText);
      const id = await insertRecipe(recipe as any);
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
