'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Recipe } from '@/lib/db';
import PageHeader from '../../../_components/PageHeader';
import Spinner from '../../../_components/Spinner';

const CATEGORY_OPTIONS = [
  'main',
  'side',
  'appetizer',
  'dessert',
  'breakfast',
  'bread',
  'soup',
  'salad',
  'condiment',
  'drink',
  'snack',
];

interface Form {
  name: string;
  description: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  servings: string;
  recipe_category: string;
  recipe_cuisine: string;
  ingredients: string;
  instructions: string;
  notes: string;
  image_url: string;
  source_url: string;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/recipes/${id}`);
        if (!response.ok) throw new Error('Recipe not found');
        const recipe: Recipe = await response.json();
        setForm({
          name: recipe.name ?? '',
          description: recipe.description ?? '',
          prep_time: recipe.prep_time != null ? String(recipe.prep_time) : '',
          cook_time: recipe.cook_time != null ? String(recipe.cook_time) : '',
          total_time: recipe.total_time != null ? String(recipe.total_time) : '',
          servings: recipe.servings ?? '',
          recipe_category: recipe.recipe_category ?? '',
          recipe_cuisine: recipe.recipe_cuisine ?? '',
          ingredients: (recipe.ingredients ?? []).join('\n'),
          instructions: (recipe.instructions ?? []).join('\n'),
          notes: recipe.notes ?? '',
          image_url: recipe.image_url ?? '',
          source_url: recipe.source_url ?? '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const update = (field: keyof Form, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!form) return;

    if (!form.name.trim()) {
      setError('Recipe name is required');
      return;
    }
    if (toLines(form.ingredients).length === 0) {
      setError('At least one ingredient is required');
      return;
    }
    if (toLines(form.instructions).length === 0) {
      setError('At least one instruction step is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          prep_time: toNumberOrNull(form.prep_time),
          cook_time: toNumberOrNull(form.cook_time),
          total_time: toNumberOrNull(form.total_time),
          servings: form.servings.trim() || null,
          recipe_category: form.recipe_category || null,
          recipe_cuisine: form.recipe_cuisine.trim() || null,
          ingredients: toLines(form.ingredients),
          instructions: toLines(form.instructions),
          notes: form.notes.trim() || null,
          image_url: form.image_url.trim() || null,
          source_url: form.source_url.trim() || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save changes');
      }

      router.push(`/recipes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading recipe...</p>
      </div>
    );
  }

  if (!form) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={`Edit: ${form.name || 'Recipe'}`}
        back={{ label: 'Back to recipe', href: `/recipes/${id}` }}
        maxWidth="4xl"
      />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="prep_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Prep (min)
                </label>
                <input
                  id="prep_time"
                  type="number"
                  value={form.prep_time}
                  onChange={(e) => update('prep_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="cook_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Cook (min)
                </label>
                <input
                  id="cook_time"
                  type="number"
                  value={form.cook_time}
                  onChange={(e) => update('cook_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="total_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Total (min)
                </label>
                <input
                  id="total_time"
                  type="number"
                  value={form.total_time}
                  onChange={(e) => update('total_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-1">
                  Servings
                </label>
                <input
                  id="servings"
                  type="text"
                  value={form.servings}
                  onChange={(e) => update('servings', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="recipe_category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="recipe_category"
                  value={form.recipe_category}
                  onChange={(e) => update('recipe_category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Uncategorized</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="recipe_cuisine" className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine
                </label>
                <input
                  id="recipe_cuisine"
                  type="text"
                  value={form.recipe_cuisine}
                  onChange={(e) => update('recipe_cuisine', e.target.value)}
                  placeholder="e.g., Italian, Japanese"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">
                Ingredients <span className="text-gray-400 font-normal">(one per line)</span>
              </label>
              <textarea
                id="ingredients"
                value={form.ingredients}
                onChange={(e) => update('ingredients', e.target.value)}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
                Instructions <span className="text-gray-400 font-normal">(one step per line)</span>
              </label>
              <textarea
                id="instructions"
                value={form.instructions}
                onChange={(e) => update('instructions', e.target.value)}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Photo URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="image_url"
                  type="url"
                  value={form.image_url}
                  onChange={(e) => update('image_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="source_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Source URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="source_url"
                  type="url"
                  value={form.source_url}
                  onChange={(e) => update('source_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <Link
              href={`/recipes/${id}`}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
