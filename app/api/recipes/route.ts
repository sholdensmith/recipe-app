import { NextRequest, NextResponse } from 'next/server';
import { getAllRecipes, insertRecipe, filterRecipes, getCategories, getCuisines, type Recipe } from '@/lib/db';
import { getCuisinesForFilter } from '@/lib/cuisine-hierarchy';
import { recipeCreateSchema, firstIssue } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'categories') {
      const categories = await getCategories();
      return NextResponse.json(categories);
    }

    if (action === 'cuisines') {
      const cuisines = await getCuisines();
      return NextResponse.json(cuisines);
    }

    const category = searchParams.get('category') || undefined;
    const cuisine = searchParams.get('cuisine') || undefined;
    const search = searchParams.get('search') || undefined;
    const favorites = searchParams.get('favorites') === 'true';

    if (category || cuisine || search || favorites) {
      // If cuisine is specified, expand it to include child cuisines
      const cuisines = cuisine ? getCuisinesForFilter(cuisine) : undefined;
      const recipes = await filterRecipes({ category, cuisines, search, favorites });
      return NextResponse.json(recipes);
    }

    const recipes = await getAllRecipes();
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
    const body = await request.json();

    const result = recipeCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: firstIssue(result.error) }, { status: 400 });
    }

    // zod nullish fields ("null") are stored as NULL by the db layer
    const id = await insertRecipe(result.data as Recipe);
    return NextResponse.json({ id, message: 'Recipe created successfully' });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
