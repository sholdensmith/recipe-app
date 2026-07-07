'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Recipe } from '@/lib/db';
import type { MisePlan } from '@/lib/ai/mise-en-place';
import { scaleIngredient } from '@/lib/scale-ingredient';
import PageHeader from '../../_components/PageHeader';
import Toast from '../../_components/Toast';
import ConfirmDialog from '../../_components/ConfirmDialog';
import ActionMenu from '../../_components/ActionMenu';

const SCALE_OPTIONS = [
  { label: '½×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '1½×', value: 1.5 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
];

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedCategory, setEditedCategory] = useState('');
  const [editedCuisine, setEditedCuisine] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scale, setScale] = useState(1);
  const [cookMode, setCookMode] = useState(false);
  // Step 0 is mise en place (ingredient prep); steps 1..n are instructions
  const [cookStep, setCookStep] = useState(0);
  const [miseChecked, setMiseChecked] = useState<Set<string>>(new Set());
  // AI-organized prep plan (bowl groupings + setup tasks); null = plain list
  const [misePlan, setMisePlan] = useState<MisePlan | null>(null);
  const [misePlanScale, setMisePlanScale] = useState<number | null>(null);
  const [miseLoading, setMiseLoading] = useState(false);

  const toggleMise = (key: string) => {
    setMiseChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const startCookMode = () => {
    setCookStep(0);
    setMiseChecked(new Set());
    setCookMode(true);

    // Reuse the plan if we already fetched it for this scale
    if (misePlan && misePlanScale === scale) return;

    setMiseLoading(true);
    setMisePlan(null);
    fetch(`/api/recipes/${id}/mise-en-place?scale=${scale}`)
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setMisePlan(data);
        setMisePlanScale(scale);
        setMiseChecked(new Set());
      })
      .catch(() => {
        // AI organization is best-effort; the plain checklist still shows
      })
      .finally(() => setMiseLoading(false));
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null);

  // Keep the screen awake while cooking (best effort; not all browsers support it)
  useEffect(() => {
    if (!cookMode) return;

    let cancelled = false;
    const acquire = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (nav.wakeLock) {
          const lock = await nav.wakeLock.request('screen');
          if (cancelled) {
            lock.release();
          } else {
            wakeLockRef.current = lock;
          }
        }
      } catch {
        // Wake lock is a nice-to-have; ignore failures
      }
    };

    acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release?.();
      wakeLockRef.current = null;
    };
  }, [cookMode]);

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
    // Defer until the action menu has finished closing — WebKit (iOS
    // Safari) silently drops window.print() when it's called while the
    // DOM is mid-update. 200ms stays within the user-activation window.
    setTimeout(() => window.print(), 200);
  };

  const handleDelete = async () => {
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
      setToast('Failed to delete recipe. Please try again.');
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
      setToast('Failed to save notes. Please try again.');
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
      setToast('Failed to save category and cuisine. Please try again.');
      console.error('Error saving metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!recipe) return;

    const newBookmarkState = !recipe.is_favorite;

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_favorite: newBookmarkState ? 1 : 0 }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bookmark status');
      }

      // Update local state
      setRecipe({ ...recipe, is_favorite: newBookmarkState });
    } catch (err) {
      setToast('Failed to update bookmark. Please try again.');
      console.error('Error updating bookmark:', err);
    }
  };

  const handleToggleFanFavorite = async () => {
    if (!recipe) return;

    const newFanFavoriteState = !recipe.is_fan_favorite;

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_fan_favorite: newFanFavoriteState ? 1 : 0 }),
      });

      if (!response.ok) {
        throw new Error('Failed to update fan favorite status');
      }

      // Update local state
      setRecipe({ ...recipe, is_fan_favorite: newFanFavoriteState });
    } catch (err) {
      setToast('Failed to update fan favorite. Please try again.');
      console.error('Error updating fan favorite:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={recipe.name}
        back={{ label: 'Back to recipes', onClick: handleBack }}
        maxWidth="4xl"
        actions={
          <>
            {/* Compact icon toggles */}
            <button
              onClick={handleToggleBookmark}
              className={`${recipe.is_favorite ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors touch-manipulation`}
              title={recipe.is_favorite ? 'Remove bookmark' : 'Bookmark this recipe'}
              aria-label={recipe.is_favorite ? 'Remove bookmark' : 'Bookmark this recipe'}
              aria-pressed={!!recipe.is_favorite}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill={recipe.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
            <button
              onClick={handleToggleFanFavorite}
              className={`${recipe.is_fan_favorite ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors touch-manipulation`}
              title={recipe.is_fan_favorite ? 'Remove fan favorite' : 'Mark as fan favorite'}
              aria-label={recipe.is_fan_favorite ? 'Remove fan favorite' : 'Mark as fan favorite'}
              aria-pressed={!!recipe.is_fan_favorite}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill={recipe.is_fan_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>

            {/* Primary action */}
            <button
              onClick={startCookMode}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 touch-manipulation min-h-[44px]"
              title="Step-by-step cooking mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span className="pointer-events-none">Cook</span>
            </button>

            {/* Everything else lives in the overflow menu */}
            <ActionMenu
              items={[
                {
                  label: 'Edit recipe',
                  onClick: () => router.push(`/recipes/${id}/edit`),
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  ),
                },
                {
                  label: 'Build menu',
                  onClick: () => router.push(`/meals/new?seedRecipeId=${id}`),
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16M19 9v6" />
                    </svg>
                  ),
                },
                {
                  label: 'Print',
                  onClick: handlePrint,
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  ),
                },
                {
                  label: 'Delete recipe',
                  onClick: () => setShowDeleteConfirm(true),
                  danger: true,
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  ),
                },
              ]}
            />
          </>
        }
      />

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
          {/* Photo */}
          {recipe.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-full max-h-96 object-cover rounded-lg mb-6 print:hidden"
            />
          )}

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
                <p className="font-semibold text-gray-900 print:text-black print:font-normal">
                  {scale === 1 ? recipe.servings : scaleIngredient(recipe.servings, scale)}
                </p>
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="mb-8 print:mb-3">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:mb-1">
              <h2 className="text-2xl font-bold text-gray-900 print:text-base print:text-black print:font-semibold">Ingredients</h2>
              <div className="flex items-center gap-1 print:hidden" role="group" aria-label="Scale recipe">
                <span className="text-sm text-gray-500 mr-1">Scale:</span>
                {SCALE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setScale(option.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      scale === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {scale !== 1 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 print:hidden">
                Quantities scaled to {scale}×. Cooking times and pan sizes may need adjusting too.
              </p>
            )}
            <ul className="space-y-2 print:space-y-0 print:text-sm">
              {recipe.ingredients.map((ingredient: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-3 print:text-black print:mr-2">•</span>
                  <span className="text-gray-700 print:text-black">
                    {scale === 1 ? ingredient : scaleIngredient(ingredient, scale)}
                  </span>
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

      {/* Cook mode: full-screen step-by-step view with the screen kept awake.
          Step 0 is mise en place; steps 1..n are the instructions. */}
      {cookMode && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <p className="font-semibold text-gray-900">{recipe.name}</p>
              <p className="text-sm text-gray-500">
                {cookStep === 0
                  ? 'Mise en place'
                  : `Step ${cookStep} of ${recipe.instructions.length}`}
              </p>
            </div>
            <button
              onClick={() => setCookMode(false)}
              className="text-gray-500 hover:text-gray-700 p-2 min-h-[44px] min-w-[44px]"
              aria-label="Exit cooking mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {cookStep === 0 ? (
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">
                  Mise en place
                </h2>
                <p className="text-gray-500 text-center mb-6">
                  Measure and prep everything before you start
                  {scale !== 1 ? ` — quantities scaled to ${scale}×` : ''}.
                </p>

                {miseLoading && (
                  <p className="flex items-center justify-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-5">
                    <span className="inline-block h-3.5 w-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    Organizing your prep — figuring out what can share a bowl...
                  </p>
                )}

                {misePlan && misePlanScale === scale ? (
                  <div className="space-y-6">
                    {misePlan.setup.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-1.5">
                          Get ready
                        </h3>
                        <ul className="space-y-1">
                          {misePlan.setup.map((task, i) => {
                            const key = `s:${i}`;
                            return (
                              <li key={key}>
                                <label className="flex items-start gap-3 cursor-pointer py-1.5 text-lg md:text-xl text-gray-800">
                                  <input
                                    type="checkbox"
                                    checked={miseChecked.has(key)}
                                    onChange={() => toggleMise(key)}
                                    className="mt-1.5 w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 shrink-0"
                                  />
                                  <span className={miseChecked.has(key) ? 'text-gray-400 line-through' : ''}>
                                    {task}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {misePlan.groups.map((group, g) => (
                      <div key={g}>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          {group.title}
                        </h3>
                        <ul className="space-y-1">
                          {group.items.map((item, i) => {
                            const key = `${g}:${i}`;
                            return (
                              <li key={key}>
                                <label className="flex items-start gap-3 cursor-pointer py-1.5 text-lg md:text-xl text-gray-800">
                                  <input
                                    type="checkbox"
                                    checked={miseChecked.has(key)}
                                    onChange={() => toggleMise(key)}
                                    className="mt-1.5 w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 shrink-0"
                                  />
                                  <span className={miseChecked.has(key) ? 'text-gray-400 line-through' : ''}>
                                    {item}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ingredient, i) => {
                      const key = `i:${i}`;
                      return (
                        <li key={key}>
                          <label className="flex items-start gap-3 cursor-pointer py-2 text-lg md:text-xl text-gray-800">
                            <input
                              type="checkbox"
                              checked={miseChecked.has(key)}
                              onChange={() => toggleMise(key)}
                              className="mt-1.5 w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 shrink-0"
                            />
                            <span className={miseChecked.has(key) ? 'text-gray-400 line-through' : ''}>
                              {scale === 1 ? ingredient : scaleIngredient(ingredient, scale)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-8">
              <p className="text-2xl md:text-4xl leading-relaxed text-gray-900 max-w-3xl text-center">
                {recipe.instructions[cookStep - 1]}
              </p>
            </div>
          )}

          <div className="px-4 pb-3">
            <div className="flex gap-1 mb-3" aria-hidden="true">
              {Array.from({ length: recipe.instructions.length + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= cookStep ? 'bg-orange-500' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCookStep((s) => Math.max(0, s - 1))}
                disabled={cookStep === 0}
                className="flex-1 py-4 rounded-lg font-medium text-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                ← Back
              </button>
              {cookStep < recipe.instructions.length ? (
                <button
                  onClick={() => setCookStep((s) => Math.min(recipe.instructions.length, s + 1))}
                  className="flex-1 py-4 rounded-lg font-medium text-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                >
                  {cookStep === 0 ? 'Start cooking →' : 'Next →'}
                </button>
              ) : (
                <button
                  onClick={() => setCookMode(false)}
                  className="flex-1 py-4 rounded-lg font-medium text-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Done ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Recipe?"
          message={`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            handleDelete();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
