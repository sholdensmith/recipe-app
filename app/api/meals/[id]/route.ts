import { NextRequest, NextResponse } from 'next/server';
import { getMealWithItems, updateMeal, deleteMeal } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
  } catch (error) {
    console.error('Error fetching meal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mealId = parseInt(id, 10);

    if (isNaN(mealId)) {
      return NextResponse.json(
        { error: 'Invalid meal ID' },
        { status: 400 }
      );
    }

    const updates = await request.json();
    const success = await updateMeal(mealId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Meal not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Meal updated successfully' });
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mealId = parseInt(id, 10);

    if (isNaN(mealId)) {
      return NextResponse.json(
        { error: 'Invalid meal ID' },
        { status: 400 }
      );
    }

    const success = await deleteMeal(mealId);

    if (!success) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}
