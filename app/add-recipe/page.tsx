'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddRecipe() {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
        body: JSON.stringify({ rawText, saveToDb: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse recipe');
      }

      const result = await response.json();
      setSuccess(true);

      // Redirect to the new recipe after a short delay
      setTimeout(() => {
        router.push(`/recipes/${result.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Add New Recipe</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Paste Your Recipe
            </h2>
            <p className="text-gray-600 text-sm">
              Paste your recipe in any format. AI will automatically extract the title, ingredients,
              instructions, cooking times, and categorize it for you.
            </p>
          </div>

          <div className="mb-6">
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                Recipe successfully parsed and saved! Redirecting...
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleParse}
              disabled={parsing || success}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {parsing ? 'Parsing with AI...' : success ? 'Saved!' : 'Parse & Save Recipe'}
            </button>
            <Link
              href="/"
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for best results:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Include the recipe name/title</li>
              <li>Separate ingredients and instructions clearly</li>
              <li>Include timing information if available (prep time, cook time)</li>
              <li>Mention the cuisine type or meal category if known</li>
              <li>Include serving size or yield information</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
