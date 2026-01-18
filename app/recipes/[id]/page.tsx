'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Recipe } from '@/lib/db';

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${id}`);
      if (!response.ok) {
        throw new Error('Recipe not found');
      }
      const data = await response.json();
      setRecipe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading recipe...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Recipe not found'}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      // Redirect to home page after successful deletion
      window.location.href = '/';
    } catch (err) {
      alert('Failed to delete recipe. Please try again.');
      console.error('Error deleting recipe:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div>
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 inline-block mb-4"
              >
                ← Back to recipes
              </Link>
              <h1 className="text-4xl font-bold text-gray-900">{recipe.name}</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button
                onClick={handlePrint}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0">
        {/* Print-only header */}
        <div className="hidden print:block mb-3">
          <h1 className="text-xl font-bold text-black mb-1">{recipe.name}</h1>
          <div className="flex gap-3 text-xs text-gray-700 border-b border-gray-300 pb-1 mb-2">
            {recipe.recipe_category && (
              <span><strong>Category:</strong> {recipe.recipe_category.charAt(0).toUpperCase() + recipe.recipe_category.slice(1)}</span>
            )}
            {recipe.recipe_cuisine && (
              <span><strong>Cuisine:</strong> {recipe.recipe_cuisine}</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 print:shadow-none print:p-0">
          {/* Description */}
          {recipe.description && (
            <p className="text-lg text-gray-700 mb-6 print:text-sm print:text-black print:mb-2">{recipe.description}</p>
          )}

          {/* Metadata - hide on print since we show it in print header */}
          <div className="flex flex-wrap gap-3 mb-8 print:hidden">
            {recipe.recipe_category && (
              <span className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {recipe.recipe_category.charAt(0).toUpperCase() + recipe.recipe_category.slice(1)}
              </span>
            )}
            {recipe.recipe_cuisine && (
              <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {recipe.recipe_cuisine}
              </span>
            )}
          </div>

          {/* Time and Servings Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg print:bg-white print:p-0 print:border print:border-gray-300 print:mb-2 print:gap-2 print:text-xs print:grid-cols-4">
            {recipe.prep_time && (
              <div>
                <p className="text-sm text-gray-600 mb-1 print:text-black print:mb-0">Prep Time</p>
                <p className="font-semibold text-gray-900 print:text-black print:font-normal">{recipe.prep_time} min</p>
              </div>
            )}
            {recipe.cook_time && (
              <div>
                <p className="text-sm text-gray-600 mb-1 print:text-black print:mb-0">Cook Time</p>
                <p className="font-semibold text-gray-900 print:text-black print:font-normal">{recipe.cook_time} min</p>
              </div>
            )}
            {recipe.total_time && (
              <div>
                <p className="text-sm text-gray-600 mb-1 print:text-black print:mb-0">Total Time</p>
                <p className="font-semibold text-gray-900 print:text-black print:font-normal">{recipe.total_time} min</p>
              </div>
            )}
            {recipe.servings && (
              <div>
                <p className="text-sm text-gray-600 mb-1 print:text-black print:mb-0">Servings</p>
                <p className="font-semibold text-gray-900 print:text-black print:font-normal">{recipe.servings}</p>
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="mb-8 print:mb-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-base print:text-black print:mb-1 print:font-semibold">Ingredients</h2>
            <ul className="space-y-2 print:space-y-0 print:text-sm">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-3 print:text-black print:mr-2">•</span>
                  <span className="text-gray-700 print:text-black">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="mb-8 print:mb-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 print:text-base print:text-black print:mb-1 print:font-semibold">Instructions</h2>
            <ol className="space-y-4 print:space-y-1 print:text-sm">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-4 print:bg-white print:text-black print:border print:border-black print:w-5 print:h-5 print:text-xs print:mr-2">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 pt-1 print:text-black print:pt-0">{instruction}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Notes */}
          {recipe.notes && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:bg-white print:border-gray-400 print:mb-2 print:p-2">
              <h3 className="font-semibold text-gray-900 mb-2 print:text-black print:text-sm print:mb-1">Notes</h3>
              <p className="text-gray-700 print:text-black print:text-xs">{recipe.notes}</p>
            </div>
          )}

          {/* Author and Source */}
          <div className="pt-6 border-t border-gray-200 text-sm text-gray-600 print:hidden">
            {recipe.author && <p>By: {recipe.author}</p>}
            {recipe.source_url && (
              <p>
                Source:{' '}
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  {recipe.source_url}
                </a>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
