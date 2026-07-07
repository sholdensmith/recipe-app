'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '../_components/PageHeader';
import Spinner from '../_components/Spinner';

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

interface Draft {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resultToDraft(result: any): Draft {
  return {
    name: result.name ?? '',
    description: result.description ?? '',
    prep_time: result.prep_time != null ? String(result.prep_time) : '',
    cook_time: result.cook_time != null ? String(result.cook_time) : '',
    total_time: result.total_time != null ? String(result.total_time) : '',
    servings: result.servings ?? '',
    recipe_category: result.recipe_category ?? '',
    recipe_cuisine: result.recipe_cuisine ?? '',
    ingredients: (result.ingredients ?? []).join('\n'),
    instructions: (result.instructions ?? []).join('\n'),
    notes: result.notes ?? '',
    image_url: result.image_url ?? '',
    source_url: result.source_url ?? '',
  };
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AddRecipe() {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [rawText, setRawText] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const updateDraft = (field: keyof Draft, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Please enter recipe text');
      return;
    }

    setParsing(true);
    setError('');

    try {
      const response = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, saveToDb: false }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse recipe');
      }

      setDraft(resultToDraft(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setParsing(false);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    setParsing(true);
    setError('');

    try {
      const response = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import recipe');
      }

      setDraft(resultToDraft(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;

    if (!draft.name.trim()) {
      setError('Recipe name is required');
      return;
    }
    if (toLines(draft.ingredients).length === 0) {
      setError('At least one ingredient is required');
      return;
    }
    if (toLines(draft.instructions).length === 0) {
      setError('At least one instruction step is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          prep_time: toNumber(draft.prep_time),
          cook_time: toNumber(draft.cook_time),
          total_time: toNumber(draft.total_time),
          servings: draft.servings.trim() || undefined,
          recipe_category: draft.recipe_category || undefined,
          recipe_cuisine: draft.recipe_cuisine.trim() || undefined,
          ingredients: toLines(draft.ingredients),
          instructions: toLines(draft.instructions),
          notes: draft.notes.trim() || undefined,
          image_url: draft.image_url.trim() || undefined,
          source_url: draft.source_url.trim() || undefined,
          raw_text: rawText || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save recipe');
      }

      router.push(`/recipes/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  const handleStartOver = () => {
    setDraft(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Add New Recipe"
        back={{ label: 'Recipes', href: '/' }}
        maxWidth="4xl"
      />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {!draft ? (
            <>
              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => { setMode('text'); setError(''); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Paste text
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('url'); setError(''); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    From a link
                  </button>
                </div>
                {mode === 'text' ? (
                  <>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Paste Your Recipe
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Paste your recipe in any format. AI will extract the title, ingredients,
                      instructions, cooking times, and categorize it. You&apos;ll get to review and
                      edit everything before it&apos;s saved.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Import from a Link
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Paste a link to a recipe page. Most sites include structured recipe data
                      that imports instantly; otherwise AI reads the page for you. You&apos;ll
                      review everything before it&apos;s saved.
                    </p>
                  </>
                )}
              </div>

              {mode === 'url' && (
                <div className="mb-6">
                  <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe URL
                  </label>
                  <input
                    id="recipe-url"
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleImportUrl(); }}
                    placeholder="https://www.example.com/best-chocolate-chip-cookies"
                    disabled={parsing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              )}

              <div className={mode === 'text' ? 'mb-6' : 'hidden'}>
                <label htmlFor="recipe-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Text
                </label>
                <textarea
                  id="recipe-text"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Example:

Chocolate Chip Cookies

These classic chocolate chip cookies are soft, chewy, and delicious!

Ingredients:
- 2 1/4 cups all-purpose flour
- 1 tsp baking soda
- 1 cup butter, softened
- 3/4 cup sugar
- 2 eggs
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix flour and baking soda in a bowl
3. Beat butter and sugar until creamy
4. Add eggs and mix well
5. Gradually add flour mixture
6. Stir in chocolate chips
7. Drop spoonfuls onto baking sheet
8. Bake 9-11 minutes

Prep time: 15 minutes
Cook time: 10 minutes
Makes 48 cookies"
                  rows={20}
                  disabled={parsing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:bg-gray-50 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={mode === 'text' ? handleParse : handleImportUrl}
                  disabled={parsing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {parsing ? (
                    <>
                      <Spinner />
                      {mode === 'text' ? 'Parsing with AI...' : 'Importing...'}
                    </>
                  ) : mode === 'text' ? (
                    'Parse Recipe'
                  ) : (
                    'Import Recipe'
                  )}
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>

              <div className={mode === 'text' ? 'mt-6 p-4 bg-blue-50 rounded-lg' : 'hidden'}>
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for best results:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Include the recipe name/title</li>
                  <li>Separate ingredients and instructions clearly</li>
                  <li>Include timing information if available (prep time, cook time)</li>
                  <li>Mention the cuisine type or meal category if known</li>
                  <li>Include serving size or yield information</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Review &amp; Edit
                </h2>
                <p className="text-gray-600 text-sm">
                  Check what the AI extracted and fix anything before saving. Ingredients and
                  instructions are one per line.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={draft.name}
                    onChange={(e) => updateDraft('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => updateDraft('description', e.target.value)}
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
                      value={draft.prep_time}
                      onChange={(e) => updateDraft('prep_time', e.target.value)}
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
                      value={draft.cook_time}
                      onChange={(e) => updateDraft('cook_time', e.target.value)}
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
                      value={draft.total_time}
                      onChange={(e) => updateDraft('total_time', e.target.value)}
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
                      value={draft.servings}
                      onChange={(e) => updateDraft('servings', e.target.value)}
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
                      value={draft.recipe_category}
                      onChange={(e) => updateDraft('recipe_category', e.target.value)}
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
                      value={draft.recipe_cuisine}
                      onChange={(e) => updateDraft('recipe_cuisine', e.target.value)}
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
                    value={draft.ingredients}
                    onChange={(e) => updateDraft('ingredients', e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions <span className="text-gray-400 font-normal">(one step per line)</span>
                  </label>
                  <textarea
                    id="instructions"
                    value={draft.instructions}
                    onChange={(e) => updateDraft('instructions', e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={draft.notes}
                    onChange={(e) => updateDraft('notes', e.target.value)}
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
                      value={draft.image_url}
                      onChange={(e) => updateDraft('image_url', e.target.value)}
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
                      value={draft.source_url}
                      onChange={(e) => updateDraft('source_url', e.target.value)}
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
                    'Save Recipe'
                  )}
                </button>
                <button
                  onClick={handleStartOver}
                  disabled={saving}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Start Over
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
