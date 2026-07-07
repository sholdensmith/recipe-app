import { NextRequest, NextResponse } from 'next/server';
import { insertMealItem, getMealItems, deleteMealItem, type MealItem } from '@/lib/db';
import { mealItemCreateSchema, firstIssue } from '@/lib/validation';

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

    const items = await getMealItems(mealId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching meal items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal items' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = await request.json();

    const result = mealItemCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: firstIssue(result.error) }, { status: 400 });
    }

    const itemId = await insertMealItem({ ...result.data, meal_id: mealId } as MealItem);
    return NextResponse.json({ id: itemId, message: 'Item added to meal' });
  } catch (error) {
    console.error('Error adding meal item:', error);
    return NextResponse.json(
      { error: 'Failed to add meal item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId parameter' },
        { status: 400 }
      );
    }

    const id = parseInt(itemId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }

    const success = await deleteMealItem(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Item removed from meal' });
  } catch (error) {
    console.error('Error removing meal item:', error);
    return NextResponse.json(
      { error: 'Failed to remove meal item' },
      { status: 500 }
    );
  }
}
