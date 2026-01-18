'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Recipe, MealItemWithRecipe } from '@/lib/db';

interface DishSuggestion {
  name: string;
  rationale: string;
  category: string;
  searchQuery: string;
}

export default function NewMealPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mealName, setMealName] = useState('');
  const [servings, setServings] = useState('');
  const [notes, setNotes] = useState('');
  const [mealItems, setMealItems] = useState<MealItemWithRecipe[]>([]);
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSimpleItemForm, setShowSimpleItemForm] = useState(false);
  const [simpleItemName, setSimpleItemName] = useState('');
  const [simpleItemCategory, setSimpleItemCategory] = useState('carb');

  // Auto-generate suggestions when meal items change
  useEffect(() => {
    if (mealItems.length > 0) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [mealItems.length]);

  const generateSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const currentItems = mealItems.map(item => {
        if (item.item_type === 'recipe' && item.recipe) {
          return {
            type: 'recipe' as const,
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
    setMealItems(mealItems.filter((_, i) => i !== index));
  };

  const saveMeal = async () => {
    if (!mealName.trim()) {
      alert('Please enter a meal name');
      return;
    }

    if (mealItems.length === 0) {
      alert('Please add at least one item to the meal');
      return;
    }

    setLoading(true);
    try {
      // Create meal
      const mealResponse = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mealName, servings, notes }),
      });

      if (!mealResponse.ok) throw new Error('Failed to create meal');

      const { id: mealId } = await mealResponse.json();

      // Add items to meal
      for (const item of mealItems) {
        await fetch(`/api/meals/${mealId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: item.recipe_id,
            item_type: item.item_type,
            simple_item_name: item.simple_item_name,
            simple_item_category: item.simple_item_category,
            order_index: item.order_index,
          }),
        });
      }

      router.push(`/meals/${mealId}`);
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to save meal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/meals" className="text-gray-600 hover:text-gray-900">
              ← Back to Meals
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Plan New Meal</h1>
          </div>
        </div>
      </header>

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
                  {mealItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {item.item_type === 'recipe'
                            ? item.recipe?.name
                            : item.simple_item_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.item_type === 'recipe'
                            ? `Recipe - ${item.recipe?.recipe_category || 'uncategorized'}`
                            : `Simple item - ${item.simple_item_category || 'other'}`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
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

            <button
              onClick={saveMeal}
              disabled={loading || !mealName || mealItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Saving...' : 'Save Meal'}
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchRecipes(e.target.value);
                }}
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
                <h2 className="text-xl font-semibold">AI Suggestions</h2>
                {suggestionsLoading && (
                  <span className="text-sm text-gray-500">Thinking...</span>
                )}
              </div>

              {mealItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Add items to get AI suggestions for complementary dishes
                </p>
              ) : suggestions.length === 0 && !suggestionsLoading ? (
                <p className="text-sm text-gray-500">No suggestions available</p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-4 border border-blue-200 bg-blue-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-900">
                          {suggestion.name}
                        </p>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                          {suggestion.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {suggestion.rationale}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery(suggestion.searchQuery);
                          searchRecipes(suggestion.searchQuery);
                          // Scroll to and focus the search input
                          searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setTimeout(() => searchInputRef.current?.focus(), 500);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Search for this →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
