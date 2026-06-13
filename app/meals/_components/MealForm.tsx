'use client';

import { useState, useEffect, useRef } from 'react';
import { Recipe, MealItemWithRecipe } from '@/lib/db';
import PageHeader from '../../_components/PageHeader';

type MenuSlot =
  | 'main'
  | 'side'
  | 'protein'
  | 'carb'
  | 'veg'
  | 'salad'
  | 'soup'
  | 'bread'
  | 'dessert'
  | 'drink';

interface DishSuggestion {
  name: string;
  rationale: string;
  slot: MenuSlot;
  category: string;
  searchQuery: string;
  matches?: Recipe[];
}

const SLOT_ORDER: MenuSlot[] = [
  'main',
  'protein',
  'side',
  'carb',
  'veg',
  'salad',
  'soup',
  'bread',
  'dessert',
  'drink',
];

const SLOT_LABEL: Record<MenuSlot, string> = {
  main: 'Main',
  protein: 'Protein',
  side: 'Side',
  carb: 'Carb',
  veg: 'Veg',
  salad: 'Salad',
  soup: 'Soup',
  bread: 'Bread',
  dessert: 'Dessert',
  drink: 'Drink',
};

function slotToSimpleCategory(slot: MenuSlot): string {
  switch (slot) {
    case 'protein':
    case 'main':
      return 'protein';
    case 'carb':
    case 'bread':
      return 'carb';
    case 'veg':
    case 'salad':
      return 'veggie';
    default:
      return 'other';
  }
}

export interface MealFormSubmitPayload {
  name: string;
  servings: string;
  notes: string;
  items: MealItemWithRecipe[];
  removedItemIds: number[];
}

interface MealFormProps {
  headerTitle: string;
  submitLabel: string;
  submittingLabel: string;
  initialName?: string;
  initialServings?: string;
  initialNotes?: string;
  initialItems?: MealItemWithRecipe[];
  onSubmit: (payload: MealFormSubmitPayload) => Promise<void>;
}

export default function MealForm({
  headerTitle,
  submitLabel,
  submittingLabel,
  initialName = '',
  initialServings = '',
  initialNotes = '',
  initialItems = [],
  onSubmit,
}: MealFormProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mealName, setMealName] = useState(initialName);
  const [servings, setServings] = useState(initialServings);
  const [notes, setNotes] = useState(initialNotes);
  const [mealItems, setMealItems] = useState<MealItemWithRecipe[]>(initialItems);
  const [removedItemIds, setRemovedItemIds] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSimpleItemForm, setShowSimpleItemForm] = useState(false);
  const [simpleItemName, setSimpleItemName] = useState('');
  const [simpleItemCategory, setSimpleItemCategory] = useState('carb');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCategory, setEditingCategory] = useState('other');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate suggestions when meal items change
  useEffect(() => {
    if (mealItems.length > 0) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealItems.length]);

  const generateSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const currentItems = mealItems.map((item) => {
        if (item.item_type === 'recipe' && item.recipe) {
          return {
            type: 'recipe' as const,
            id: item.recipe.id,
            name: item.recipe.name,
            category: item.recipe.recipe_category,
            cuisine: item.recipe.recipe_cuisine,
          };
        } else {
          return {
            type: 'simple' as const,
            name: item.simple_item_name || '',
            category: item.simple_item_category,
          };
        }
      });

      const response = await fetch('/api/suggest-dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentItems, servings }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Debounce recipe search so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => searchRecipes(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchRecipes = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/recipes?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching recipes:', error);
      setSearchResults([]);
    }
  };

  const addRecipeToMeal = (recipe: Recipe) => {
    const newItem: MealItemWithRecipe = {
      meal_id: 0,
      item_type: 'recipe',
      recipe_id: recipe.id,
      recipe: recipe,
      order_index: mealItems.length,
    };
    setMealItems([...mealItems, newItem]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addSimpleItem = () => {
    if (!simpleItemName.trim()) return;

    const newItem: MealItemWithRecipe = {
      meal_id: 0,
      item_type: 'simple',
      simple_item_name: simpleItemName,
      simple_item_category: simpleItemCategory,
      order_index: mealItems.length,
    };
    setMealItems([...mealItems, newItem]);
    setSimpleItemName('');
    setSimpleItemCategory('carb');
    setShowSimpleItemForm(false);
  };

  const removeItem = (index: number) => {
    const item = mealItems[index];
    if (item?.id != null) {
      setRemovedItemIds((ids) => [...ids, item.id as number]);
    }
    setMealItems(mealItems.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= mealItems.length) return;
    const next = [...mealItems];
    [next[index], next[target]] = [next[target], next[index]];
    setMealItems(next);
    if (editingIndex === index) setEditingIndex(target);
    else if (editingIndex === target) setEditingIndex(index);
  };

  const startEditingItem = (index: number) => {
    const item = mealItems[index];
    if (item.item_type !== 'simple') return;
    setEditingIndex(index);
    setEditingName(item.simple_item_name ?? '');
    setEditingCategory(item.simple_item_category ?? 'other');
  };

  const cancelEditingItem = () => {
    setEditingIndex(null);
    setEditingName('');
    setEditingCategory('other');
  };

  const saveEditingItem = () => {
    if (editingIndex == null) return;
    if (!editingName.trim()) return;
    setMealItems(
      mealItems.map((item, i) =>
        i === editingIndex
          ? {
              ...item,
              simple_item_name: editingName.trim(),
              simple_item_category: editingCategory,
            }
          : item
      )
    );
    cancelEditingItem();
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      setFormError('Please enter a meal name');
      return;
    }

    if (mealItems.length === 0) {
      setFormError('Please add at least one item to the meal');
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const normalized = mealItems.map((item, i) => ({ ...item, order_index: i }));
      await onSubmit({
        name: mealName,
        servings,
        notes,
        items: normalized,
        removedItemIds,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={headerTitle}
        back={{ label: 'My Meals', href: '/meals' }}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Meal Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Meal Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Name
                  </label>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="Sunday Dinner"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Servings
                  </label>
                  <input
                    type="text"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special occasions, dietary notes..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Current Meal Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Meal Items ({mealItems.length})
              </h2>

              {mealItems.length === 0 ? (
                <p className="text-gray-500 text-sm">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {mealItems.map((item, index) => {
                    const isEditing = editingIndex === index;
                    const isSimple = item.item_type === 'simple';
                    return (
                      <div
                        key={item.id ?? `new-${index}`}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        {isEditing && isSimple ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                            <select
                              value={editingCategory}
                              onChange={(e) => setEditingCategory(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="carb">Carb</option>
                              <option value="protein">Protein</option>
                              <option value="veggie">Veggie</option>
                              <option value="other">Other</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditingItem}
                                disabled={!editingName.trim()}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingItem}
                                className="px-3 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <button
                                onClick={() => moveItem(index, -1)}
                                disabled={index === 0}
                                aria-label="Move up"
                                className="text-gray-500 hover:text-gray-900 disabled:text-gray-300 text-xs leading-none px-1"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moveItem(index, 1)}
                                disabled={index === mealItems.length - 1}
                                aria-label="Move down"
                                className="text-gray-500 hover:text-gray-900 disabled:text-gray-300 text-xs leading-none px-1"
                              >
                                ▼
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {item.item_type === 'recipe'
                                  ? item.recipe?.name
                                  : item.simple_item_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {item.item_type === 'recipe'
                                  ? `Recipe - ${item.recipe?.recipe_category || 'uncategorized'}`
                                  : `Simple item - ${item.simple_item_category || 'other'}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {isSimple && (
                                <button
                                  onClick={() => startEditingItem(index)}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                {!showSimpleItemForm ? (
                  <button
                    onClick={() => setShowSimpleItemForm(true)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Add Simple Item (rice, bread, etc.)
                  </button>
                ) : (
                  <div className="space-y-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Item Name
                      </label>
                      <input
                        type="text"
                        value={simpleItemName}
                        onChange={(e) => setSimpleItemName(e.target.value)}
                        placeholder="white rice, garlic bread, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={simpleItemCategory}
                        onChange={(e) => setSimpleItemCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="carb">Carb</option>
                        <option value="protein">Protein</option>
                        <option value="veggie">Veggie</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addSimpleItem}
                        disabled={!simpleItemName.trim()}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowSimpleItemForm(false);
                          setSimpleItemName('');
                          setSimpleItemCategory('carb');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600 font-medium" role="alert">
                {formError}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? submittingLabel : submitLabel}
            </button>
          </div>

          {/* Right Column: Search & Suggestions */}
          <div className="space-y-6">
            {/* Recipe Search */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Add Recipe</h2>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => addRecipeToMeal(recipe)}
                    >
                      <p className="font-medium">{recipe.name}</p>
                      <p className="text-xs text-gray-500">
                        {recipe.recipe_category} • {recipe.recipe_cuisine}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Suggested menu</h2>
                {suggestionsLoading && (
                  <span className="text-sm text-gray-500">Thinking...</span>
                )}
              </div>

              {mealItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Add items to get suggestions for complementary dishes
                </p>
              ) : suggestions.length === 0 && !suggestionsLoading ? (
                <p className="text-sm text-gray-500">No suggestions available</p>
              ) : (
                <div className="space-y-6">
                  {SLOT_ORDER.filter((slot) =>
                    suggestions.some((s) => s.slot === slot)
                  ).map((slot) => {
                    const slotSuggestions = suggestions.filter((s) => s.slot === slot);
                    return (
                      <div key={slot}>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          {SLOT_LABEL[slot]}
                        </h3>
                        <div className="space-y-3">
                          {slotSuggestions.map((suggestion, index) => {
                            const hasMatches = (suggestion.matches?.length ?? 0) > 0;
                            return (
                              <div
                                key={`${slot}-${index}`}
                                className="p-4 border border-blue-200 bg-blue-50 rounded-lg"
                              >
                                <div className="flex items-start justify-between mb-1 gap-2">
                                  <p className="font-medium text-gray-900">
                                    {suggestion.name}
                                  </p>
                                  <span className="px-2 py-1 text-xs rounded whitespace-nowrap bg-blue-200 text-blue-800">
                                    Idea
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-3">
                                  {suggestion.rationale}
                                </p>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      const newItem: MealItemWithRecipe = {
                                        meal_id: 0,
                                        item_type: 'simple',
                                        simple_item_name: suggestion.name,
                                        simple_item_category: slotToSimpleCategory(
                                          suggestion.slot
                                        ),
                                        order_index: mealItems.length,
                                      };
                                      setMealItems([...mealItems, newItem]);
                                    }}
                                    className="text-xs font-medium px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                                  >
                                    Add as simple item
                                  </button>
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(
                                      `${suggestion.name} recipe`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium px-3 py-1 border border-blue-300 text-blue-700 hover:bg-blue-100 rounded"
                                  >
                                    Search recipes
                                  </a>
                                </div>

                                {hasMatches && (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                      Related in your recipes
                                    </p>
                                    <div className="space-y-2">
                                      {suggestion.matches!.map((match) => {
                                        const alreadyAdded = mealItems.some(
                                          (m) =>
                                            m.item_type === 'recipe' &&
                                            m.recipe_id === match.id
                                        );
                                        return (
                                          <div
                                            key={match.id}
                                            className="flex items-center justify-between gap-3 p-2 bg-white border border-green-200 rounded"
                                          >
                                            <div className="min-w-0">
                                              <p className="font-medium text-gray-900 truncate">
                                                {match.name}
                                              </p>
                                              <p className="text-xs text-gray-500 truncate">
                                                {[
                                                  match.recipe_category,
                                                  match.recipe_cuisine,
                                                ]
                                                  .filter(Boolean)
                                                  .join(' • ')}
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => addRecipeToMeal(match)}
                                              disabled={alreadyAdded}
                                              className="text-xs font-medium px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded whitespace-nowrap"
                                            >
                                              {alreadyAdded ? 'Added' : 'Add'}
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
