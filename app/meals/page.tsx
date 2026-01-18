'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Meal } from '@/lib/db';

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await fetch('/api/meals');
      const data = await response.json();
      setMeals(data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                ← Recipes
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">My Meals</h1>
            </div>
            <Link
              href="/meals/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Plan New Meal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading meals...</p>
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
