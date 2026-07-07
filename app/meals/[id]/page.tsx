'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MealWithItems, MealItemWithRecipe } from '@/lib/db';
import PageHeader from '../../_components/PageHeader';
import Toast from '../../_components/Toast';
import ConfirmDialog from '../../_components/ConfirmDialog';

interface GroceryItem {
  name: string;
  quantity?: string | null;
  category: string;
}

const CATEGORY_ORDER = [
  'produce',
  'meat & seafood',
  'dairy & eggs',
  'bakery',
  'pantry',
  'spices',
  'frozen',
  'drinks',
  'other',
];

export default function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [meal, setMeal] = useState<MealWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[] | null>(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [groceryConsolidated, setGroceryConsolidated] = useState(true);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const fetchGroceryList = async () => {
    setGroceryLoading(true);
    try {
      const response = await fetch(`/api/meals/${id}/grocery-list`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to build grocery list');
      }
      setGroceryItems(data.items);
      setGroceryConsolidated(data.consolidated);
      setChecked(new Set());
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Failed to build grocery list');
    } finally {
      setGroceryLoading(false);
    }
  };

  const toggleChecked = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyGroceryList = async () => {
    if (!groceryItems) return;
    const lines = groceryItems.map((item) =>
      item.quantity ? `- ${item.quantity} ${item.name}` : `- ${item.name}`
    );
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setToast('Grocery list copied to clipboard');
    } catch {
      setToast('Could not copy to clipboard');
    }
  };

  useEffect(() => {
    fetchMeal();
  }, [id]);

  const fetchMeal = async () => {
    try {
      const response = await fetch(`/api/meals/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMeal(data);
      }
    } catch (error) {
      console.error('Error fetching meal:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async () => {
    try {
      const response = await fetch(`/api/meals/${id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/meals');
      } else {
        const errorData = await response.json();
        setToast(`Failed to delete meal: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      setToast('Failed to delete meal. Please try again.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>;
  }

  if (!meal) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-600">Meal not found</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Meal?"
          message={`Are you sure you want to delete "${meal.name}"? This action cannot be undone.`}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            deleteMeal();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <PageHeader
        title={meal.name}
        back={{ label: 'My Meals', href: '/meals' }}
        maxWidth="4xl"
        actions={
          <>
            <Link
              href={`/meals/${id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Delete
            </button>
          </>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {meal.servings && (
            <p className="text-gray-600 mb-2">Servings: {meal.servings}</p>
          )}
          {meal.notes && (
            <p className="text-gray-700 mb-6">{meal.notes}</p>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Items</h2>
          <div className="space-y-4">
            {meal.items.map((item: MealItemWithRecipe) => (
              <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                {item.item_type === 'recipe' && item.recipe ? (
                  <div>
                    <Link
                      href={`/recipes/${item.recipe.id}`}
                      className="text-lg font-medium text-blue-600 hover:text-blue-700"
                    >
                      {item.recipe.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {item.recipe.recipe_category} • {item.recipe.recipe_cuisine}
                    </p>
                    {item.recipe.description && (
                      <p className="text-sm text-gray-700 mt-2">{item.recipe.description}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {item.simple_item_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Simple item • {item.simple_item_category}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grocery list */}
        <div className="bg-white rounded-lg shadow-sm p-8 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Grocery List</h2>
            <div className="flex gap-2">
              {groceryItems && (
                <button
                  onClick={copyGroceryList}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Copy
                </button>
              )}
              <button
                onClick={fetchGroceryList}
                disabled={groceryLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {groceryLoading
                  ? 'Building...'
                  : groceryItems
                    ? 'Rebuild'
                    : 'Build Grocery List'}
              </button>
            </div>
          </div>

          {!groceryItems && !groceryLoading && (
            <p className="text-gray-600 text-sm">
              Combine the ingredients from every dish in this meal into one shopping list,
              organized by store section.
            </p>
          )}

          {groceryLoading && (
            <p className="text-gray-500 text-sm py-4">
              Combining ingredients across dishes — this takes a few seconds...
            </p>
          )}

          {groceryItems && !groceryLoading && (
            <>
              {!groceryConsolidated && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                  Smart consolidation wasn&apos;t available, so this is the raw ingredient list.
                </p>
              )}
              <div className="space-y-5 mt-4">
                {CATEGORY_ORDER.filter((cat) =>
                  groceryItems.some((item) => item.category === cat)
                ).map((cat) => (
                  <div key={cat}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {cat}
                    </h3>
                    <ul className="space-y-1">
                      {groceryItems.map((item, index) =>
                        item.category === cat ? (
                          <li key={index}>
                            <label className="flex items-start gap-3 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                checked={checked.has(index)}
                                onChange={() => toggleChecked(index)}
                                className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span
                                className={
                                  checked.has(index)
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-800'
                                }
                              >
                                {item.quantity ? (
                                  <>
                                    <span className="font-medium">{item.quantity}</span>{' '}
                                    {item.name}
                                  </>
                                ) : (
                                  item.name
                                )}
                              </span>
                            </label>
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
