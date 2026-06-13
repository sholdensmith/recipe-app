'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Recipe, MealItemWithRecipe } from '@/lib/db';
import MealForm, { MealFormSubmitPayload } from '../_components/MealForm';
import Toast from '../../_components/Toast';

function NewMealPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seedRecipeId = searchParams.get('seedRecipeId');
  const [initialName, setInitialName] = useState('');
  const [initialItems, setInitialItems] = useState<MealItemWithRecipe[]>([]);
  const [seedLoading, setSeedLoading] = useState(Boolean(seedRecipeId));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!seedRecipeId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/recipes/${seedRecipeId}`);
        if (!response.ok) return;
        const recipe: Recipe = await response.json();
        if (cancelled || !recipe?.id) return;
        setInitialItems([
          {
            meal_id: 0,
            item_type: 'recipe',
            recipe_id: recipe.id,
            recipe,
            order_index: 0,
          },
        ]);
        setInitialName(`Menu with ${recipe.name}`);
      } catch (err) {
        console.error('Error loading seed recipe:', err);
      } finally {
        if (!cancelled) setSeedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seedRecipeId]);

  const handleSubmit = async ({ name, servings, notes, items }: MealFormSubmitPayload) => {
    try {
      const mealResponse = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, servings, notes }),
      });

      if (!mealResponse.ok) throw new Error('Failed to create meal');

      const { id: mealId } = await mealResponse.json();

      for (const item of items) {
        await fetch(`/api/meals/${mealId}/items`, {
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

      router.push(`/meals/${mealId}`);
    } catch (error) {
      console.error('Error saving meal:', error);
      setToast('Failed to save meal. Please try again.');
    }
  };

  if (seedLoading) return null;

  return (
    <>
      <MealForm
        headerTitle="Plan New Meal"
        submitLabel="Save Meal"
        submittingLabel="Saving..."
        initialName={initialName}
        initialItems={initialItems}
        onSubmit={handleSubmit}
      />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

export default function NewMealPage() {
  return (
    <Suspense fallback={null}>
      <NewMealPageContent />
    </Suspense>
  );
}
