import { NextRequest, NextResponse } from 'next/server';
import { getAllMeals, insertMeal, getMealWithItems } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      const mealId = parseInt(id, 10);
      if (isNaN(mealId)) {
        return NextResponse.json(
          { error: 'Invalid meal ID' },
          { status: 400 }
        );
      }

      const meal = getMealWithItems(mealId);
      if (!meal) {
        return NextResponse.json(
          { error: 'Meal not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(meal);
    }

    const meals = getAllMeals();
    return NextResponse.json(meals);
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const meal = await request.json();

    if (!meal.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const id = insertMeal(meal);
    return NextResponse.json({ id, message: 'Meal created successfully' });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    );
  }
}
