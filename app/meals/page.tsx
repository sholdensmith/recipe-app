'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Meal } from '@/lib/db';
import PageHeader from '../_components/PageHeader';

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await fetch('/api/meals');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        const message =
          (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : null) || `Request failed (${response.status})`;
        throw new Error(message);
      }
      setMeals(data);
    } catch (err) {
      console.error('Error fetching meals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="My Meals"
        back={{ label: 'Recipes', href: '/' }}
        actions={
          <Link
            href="/meals/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Plan New Meal
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading meals...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-red-600 mb-2 font-medium">Couldn&apos;t load meals</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchMeals();
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-4">No saved meals yet.</p>
            <Link
              href="/meals/new"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Plan your first meal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map((meal) => (
              <Link
                key={meal.id}
                href={`/meals/${meal.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {meal.name}
                </h3>
                {meal.servings && (
                  <p className="text-sm text-gray-600 mb-2">
                    Servings: {meal.servings}
                  </p>
                )}
                {meal.notes && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {meal.notes}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
