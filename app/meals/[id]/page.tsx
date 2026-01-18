'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MealWithItems } from '@/lib/db';

export default function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [meal, setMeal] = useState<MealWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        alert(`Failed to delete meal: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal. Please try again.');
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
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Meal?</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{meal.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  deleteMeal();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/meals" className="text-gray-600 hover:text-gray-900 inline-block mb-4">
                ← Back to Meals
              </Link>
              <h1 className="text-4xl font-bold text-gray-900">{meal.name}</h1>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

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
            {meal.items.map((item: any) => (
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
      </main>
    </div>
  );
}
