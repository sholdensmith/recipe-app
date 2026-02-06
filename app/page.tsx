'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Recipe } from '@/lib/db';
import { CUISINE_HIERARCHY, getParentCuisines } from '@/lib/cuisine-hierarchy';

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
    fetchCuisines();
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [selectedCategory, selectedCuisine, searchQuery, showFavoritesOnly]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedCuisine) params.set('cuisine', selectedCuisine);
      if (searchQuery) params.set('search', searchQuery);
      if (showFavoritesOnly) params.set('favorites', 'true');

      const response = await fetch(`/api/recipes?${params}`);
      const data = await response.json();

      // Check if response is successful and data is an array
      if (response.ok && Array.isArray(data)) {
        setRecipes(data);
      } else {
        console.error('Error fetching recipes:', data);
        setRecipes([]);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/recipes?action=categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCuisines = async () => {
    try {
      const response = await fetch('/api/recipes?action=cuisines');
      const data = await response.json();
      setCuisines(data);
    } catch (error) {
      console.error('Error fetching cuisines:', error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, recipeId: number) => {
    e.preventDefault(); // Prevent navigation to recipe detail page
    e.stopPropagation();

    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const newFavoriteState = !recipe.is_favorite;

    // Optimistically update UI
    setRecipes(recipes.map(r =>
      r.id === recipeId ? { ...r, is_favorite: newFavoriteState } : r
    ));

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newFavoriteState ? 1 : 0 }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
    } catch (err) {
      // Revert on error
      setRecipes(recipes.map(r =>
        r.id === recipeId ? { ...r, is_favorite: !newFavoriteState } : r
      ));
      alert('Failed to update favorite status. Please try again.');
      console.error('Error updating favorite:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Smith Family Recipes</h1>
            <div className="flex gap-2">
              <Link
                href="/meals"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                My Meals
              </Link>
              <Link
                href="/add-recipe"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add Recipe
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filter Recipes</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Favorites only
              </span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search by ingredient or name
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., chicken, tomato..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine
              </label>
              <select
                id="cuisine"
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">All Cuisines</option>
                {/* Parent cuisines */}
                {getParentCuisines().map((parent) => (
                  <option key={parent} value={parent}>
                    {parent} (All)
                  </option>
                ))}
                {/* Individual cuisines from the database */}
                {cuisines.filter((cui) => !getParentCuisines().includes(cui)).map((cui) => (
                  <option key={cui} value={cui}>
                    {cui}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedCategory || selectedCuisine || searchQuery || showFavoritesOnly) && (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedCuisine('');
                setSearchQuery('');
                setShowFavoritesOnly(false);
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Recipe Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-4">No recipes found.</p>
            <Link
              href="/add-recipe"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first recipe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
              >
                {/* Star button overlay */}
                <button
                  onClick={(e) => handleToggleFavorite(e, recipe.id!)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill={recipe.is_favorite ? '#EAB308' : 'none'}
                    viewBox="0 0 24 24"
                    stroke={recipe.is_favorite ? '#EAB308' : '#9CA3AF'}
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 pr-8">{recipe.name}</h3>
                  {recipe.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.recipe_category && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {recipe.recipe_category}
                      </span>
                    )}
                    {recipe.recipe_cuisine && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        {recipe.recipe_cuisine}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    {recipe.total_time && (
                      <p>Total time: {recipe.total_time} min</p>
                    )}
                    {recipe.servings && (
                      <p>Servings: {recipe.servings}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
