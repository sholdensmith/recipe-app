import { NextRequest, NextResponse } from 'next/server';
import { getMealWithItems } from '@/lib/db';
import { consolidateGroceryList, type GroceryDish, type GroceryItem } from '@/lib/ai/grocery-list';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mealId = parseInt(id, 10);

    if (isNaN(mealId)) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const limit = checkRateLimit(request, 'ai', AI_RATE_LIMIT);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const meal = await getMealWithItems(mealId);
    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    const dishes: GroceryDish[] = meal.items.map((item) =>
      item.item_type === 'recipe' && item.recipe
        ? { name: item.recipe.name, ingredients: item.recipe.ingredients ?? [] }
        : { name: item.simple_item_name ?? 'Item', ingredients: [] }
    );

    if (dishes.length === 0) {
      return NextResponse.json(
        { error: 'This meal has no items yet — add some dishes first' },
        { status: 422 }
      );
    }

    try {
      const items = await consolidateGroceryList(dishes);
      return NextResponse.json({ items, consolidated: true });
    } catch (aiError) {
      // AI consolidation is best-effort; fall back to the raw ingredient list
      console.error('Grocery list consolidation failed, returning raw list:', aiError);
      const items: GroceryItem[] = dishes.flatMap((dish) =>
        dish.ingredients.length > 0
          ? dish.ingredients.map((ing) => ({ name: ing, quantity: undefined, category: 'other' }))
          : [{ name: dish.name, quantity: undefined, category: 'other' }]
      );
      return NextResponse.json({ items, consolidated: false });
    }
  } catch (error) {
    console.error('Error building grocery list:', error);
    return NextResponse.json({ error: 'Failed to build grocery list' }, { status: 500 });
  }
}
