import { NextRequest, NextResponse } from 'next/server';
import { getAllRecipes, insertRecipe, filterRecipes, getCategories, getCuisines } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'categories') {
      const categories = getCategories();
      return NextResponse.json(categories);
    }

    if (action === 'cuisines') {
      const cuisines = getCuisines();
      return NextResponse.json(cuisines);
    }

    const category = searchParams.get('category') || undefined;
    const cuisine = searchParams.get('cuisine') || undefined;
    const search = searchParams.get('search') || undefined;

    if (category || cuisine || search) {
      const recipes = filterRecipes({ category, cuisine, search });
      return NextResponse.json(recipes);
    }

    const recipes = getAllRecipes();
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const recipe = await request.json();

    // Validate required fields
    if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, ingredients, or instructions' },
        { status: 400 }
      );
    }

    const id = insertRecipe(recipe);
    return NextResponse.json({ id, message: 'Recipe created successfully' });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
