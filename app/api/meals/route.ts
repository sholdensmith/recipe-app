import { NextRequest, NextResponse } from 'next/server';
import { getAllMeals, insertMeal, getMealWithItems, type Meal } from '@/lib/db';
import { mealCreateSchema, firstIssue } from '@/lib/validation';

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

      const meal = await getMealWithItems(mealId);
      if (!meal) {
        return NextResponse.json(
          { error: 'Meal not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(meal);
    }

    const meals = await getAllMeals();
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
    const body = await request.json();

    const result = mealCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: firstIssue(result.error) }, { status: 400 });
    }

    const id = await insertMeal(result.data as Meal);
    return NextResponse.json({ id, message: 'Meal created successfully' });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    );
  }
}
