'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MealWithItems } from '@/lib/db';
import MealForm, { MealFormSubmitPayload } from '../../_components/MealForm';

export default function EditMealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [meal, setMeal] = useState<MealWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/meals/${id}`);
        if (cancelled) return;
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) return;
        const data: MealWithItems = await response.json();
        if (!cancelled) setMeal(data);
      } catch (error) {
        console.error('Error fetching meal:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async ({
    name,
    servings,
    notes,
    items,
    removedItemIds,
  }: MealFormSubmitPayload) => {
    try {
      const patchResponse = await fetch(`/api/meals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, servings, notes }),
      });

      if (!patchResponse.ok) throw new Error('Failed to update meal');

      for (const itemId of removedItemIds) {
        await fetch(`/api/meals/${id}/items?itemId=${itemId}`, { method: 'DELETE' });
      }

      for (const item of items) {
        if (item.id != null) {
          const updates: Record<string, unknown> = { order_index: item.order_index };
          if (item.item_type === 'simple') {
            updates.simple_item_name = item.simple_item_name;
            updates.simple_item_category = item.simple_item_category;
          }
          await fetch(`/api/meals/${id}/items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
        } else {
          await fetch(`/api/meals/${id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipe_id: item.recipe_id,
              item_type: item.item_type,
              simple_item_name: item.simple_item_name,
              simple_item_category: item.simple_item_category,
              order_index: item.order_index,
            }),
          });
        }
      }

      router.push(`/meals/${id}`);
    } catch (error) {
      console.error('Error updating meal:', error);
      alert('Failed to update meal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (notFound || !meal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Meal not found</p>
      </div>
    );
  }

  return (
    <MealForm
      headerTitle={`Edit ${meal.name}`}
      submitLabel="Update Meal"
      submittingLabel="Updating..."
      initialName={meal.name}
      initialServings={meal.servings ?? ''}
      initialNotes={meal.notes ?? ''}
      initialItems={meal.items}
      onSubmit={handleSubmit}
    />
  );
}
