import { NextRequest, NextResponse } from 'next/server';
import { updateMealItem, type MealItem } from '@/lib/db';
import { mealItemPatchSchema, firstIssue } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const id = parseInt(itemId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();

    const result = mealItemPatchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: firstIssue(result.error) }, { status: 400 });
    }

    const success = await updateMealItem(id, result.data as Partial<MealItem>);

    if (!success) {
      return NextResponse.json(
        { error: 'Item not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Item updated' });
  } catch (error) {
    console.error('Error updating meal item:', error);
    return NextResponse.json({ error: 'Failed to update meal item' }, { status: 500 });
  }
}
