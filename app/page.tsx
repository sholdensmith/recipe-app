'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Recipe } from '@/lib/db';
import { CUISINE_HIERARCHY, getParentCuisines } from '@/lib/cuisine-hierarchy';
import PageHeader from './_components/PageHeader';
import Toast from './_components/Toast';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') ?? '');
  const [selectedCuisine, setSelectedCuisine] = useState<string>(searchParams.get('cuisine') ?? '');
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('search') ?? '');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') ?? '');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState<boolean>(searchParams.get('favorites') === 'true');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchCuisines();
  }, []);

  // Debounce search input so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchRecipes();
  }, [selectedCategory, selectedCuisine, searchQuery, showBookmarkedOnly]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedCuisine) params.set('cuisine', selectedCuisine);
    if (searchQuery) params.set('search', searchQuery);
    if (showBookmarkedOnly) params.set('favorites', 'true');
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [selectedCategory, selectedCuisine, searchQuery, showBookmarkedOnly, router]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedCuisine) params.set('cuisine', selectedCuisine);
      if (searchQuery) params.set('search', searchQuery);
      if (showBookmarkedOnly) params.set('favorites', 'true');

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

  const handleToggleBookmark = async (e: React.MouseEvent, recipeId: number) => {
    e.preventDefault(); // Prevent navigation to recipe detail page
    e.stopPropagation();

    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const newBookmarkState = !recipe.is_favorite;

    // Optimistically update UI
    setRecipes(recipes.map(r =>
      r.id === recipeId ? { ...r, is_favorite: newBookmarkState } : r
    ));

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newBookmarkState ? 1 : 0 }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bookmark status');
      }
    } catch (err) {
      // Revert on error
      setRecipes(recipes.map(r =>
        r.id === recipeId ? { ...r, is_favorite: !newBookmarkState } : r
      ));
      setToast('Failed to update bookmark. Please try again.');
      console.error('Error updating bookmark:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Recipes"
        actions={
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/recipes/export';
            }}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Export
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filter Recipes</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBookmarkedOnly}
                onChange={(e) => setShowBookmarkedOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                Bookmarked only
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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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

          {(selectedCategory || selectedCuisine || searchInput || showBookmarkedOnly) && (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedCuisine('');
                setSearchInput('');
                setSearchQuery('');
                setShowBookmarkedOnly(false);
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Recipe Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading recipes" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
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
                {/* Bookmark button overlay */}
                <button
                  onClick={(e) => handleToggleBookmark(e, recipe.id!)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title={recipe.is_favorite ? 'Remove bookmark' : 'Bookmark this recipe'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill={recipe.is_favorite ? '#2563EB' : 'none'}
                    viewBox="0 0 24 24"
                    stroke={recipe.is_favorite ? '#2563EB' : '#9CA3AF'}
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                    />
                  </svg>
                </button>

                {/* Fan Favorite stamp */}
                {recipe.is_fan_favorite ? (
                  <span className="absolute bottom-3 right-3 z-10 -rotate-12 select-none rounded-md border-2 border-red-500/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-600/90 bg-red-50/70">
                    Fan Favorite
                  </span>
                ) : null}

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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
