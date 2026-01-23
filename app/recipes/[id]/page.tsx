'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Recipe } from '@/lib/db';

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedCategory, setEditedCategory] = useState('');
  const [editedCuisine, setEditedCuisine] = useState('');

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

  const handleEditNotes = () => {
    setEditedNotes(recipe?.notes || '');
    setIsEditingNotes(true);
  };

  const handleCancelEdit = () => {
    setIsEditingNotes(false);
    setEditedNotes('');
  };

  const handleSaveNotes = async () => {
    if (!recipe) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: editedNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      // Update local state
      setRecipe({ ...recipe, notes: editedNotes });
      setIsEditingNotes(false);
    } catch (err) {
      alert('Failed to save notes. Please try again.');
      console.error('Error saving notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMetadata = () => {
    setEditedCategory(recipe?.recipe_category || '');
    setEditedCuisine(recipe?.recipe_cuisine || '');
    setIsEditingMetadata(true);
  };

  const handleCancelMetadataEdit = () => {
    setIsEditingMetadata(false);
    setEditedCategory('');
    setEditedCuisine('');
  };

  const handleSaveMetadata = async () => {
    if (!recipe) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_category: editedCategory || null,
          recipe_cuisine: editedCuisine || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update metadata');
      }

      // Update local state
      setRecipe({
        ...recipe,
        recipe_category: editedCategory || undefined,
        recipe_cuisine: editedCuisine || undefined,
      });
      setIsEditingMetadata(false);
    } catch (err) {
      alert('Failed to save category and cuisine. Please try again.');
      console.error('Error saving metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!recipe) return;

    const newFavoriteState = !recipe.is_favorite;

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_favorite: newFavoriteState ? 1 : 0 }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      // Update local state
      setRecipe({ ...recipe, is_favorite: newFavoriteState });
    } catch (err) {
      alert('Failed to update favorite status. Please try again.');
      console.error('Error updating favorite:', err);
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
                onClick={handleToggleFavorite}
                className={`${recipe.is_favorite ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-200 hover:bg-gray-300'} text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2`}
                title={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={recipe.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {recipe.is_favorite ? 'Starred' : 'Star'}
              </button>
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
          <div className="mb-8 print:hidden">
            {isEditingMetadata ? (
              <div className="space-y-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category...</option>
                    <option value="main">Main</option>
                    <option value="side">Side</option>
                    <option value="appetizer">Appetizer</option>
                    <option value="dessert">Dessert</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="bread">Bread</option>
                    <option value="soup">Soup</option>
                    <option value="salad">Salad</option>
                    <option value="condiment">Condiment</option>
                    <option value="drink">Drink</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                  <input
                    type="text"
                    value={editedCuisine}
                    onChange={(e) => setEditedCuisine(e.target.value)}
                    placeholder="e.g., Italian, Japanese, Mexican"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveMetadata}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelMetadataEdit}
                    disabled={isSaving}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors disabled:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 items-center">
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
                <button
                  onClick={handleEditMetadata}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title="Edit category and cuisine"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
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
              {recipe.ingredients.map((ingredient: string, index: number) => (
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
              {recipe.instructions.map((instruction: string, index: number) => (
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
          {(recipe.notes || isEditingNotes) && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:bg-white print:border-gray-400 print:mb-2 print:p-2 relative">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 print:text-black print:text-sm print:mb-1">Notes</h3>
                {!isEditingNotes && (
                  <button
                    onClick={handleEditNotes}
                    className="text-gray-500 hover:text-gray-700 print:hidden"
                    title="Edit notes"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="print:hidden">
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] text-gray-700"
                    placeholder="Add notes about this recipe..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:bg-gray-400"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors disabled:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 print:text-black print:text-xs whitespace-pre-wrap">{recipe.notes}</p>
              )}
            </div>
          )}
          {!recipe.notes && !isEditingNotes && (
            <div className="mb-8 print:hidden">
              <button
                onClick={handleEditNotes}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Notes
              </button>
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
