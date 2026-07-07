'use client';

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { Recipe } from '@/lib/db';
import type { MisePlan } from '@/lib/ai/mise-en-place';
import type { CookSheetPlan } from '@/lib/ai/cook-sheet';
import { layoutCookSheet, type SheetCell } from '@/lib/cook-sheet-layout';
import { scaleIngredient } from '@/lib/scale-ingredient';
import PageHeader from '../../../_components/PageHeader';
import Spinner from '../../../_components/Spinner';

const SCALE_OPTIONS = [
  { label: '½×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '1½×', value: 1.5 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
];

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4 print:mb-2">
      <div className="flex items-center gap-2.5">
        <span className="flex-none w-6 h-6 rounded-full border-2 border-blue-600 text-blue-600 text-xs font-bold flex items-center justify-center print:w-5 print:h-5 print:border-black print:text-black">
          {number}
        </span>
        <h2 className="text-xl font-bold text-gray-900 print:text-base print:text-black">{title}</h2>
      </div>
      <p className="text-sm text-gray-500 ml-[34px] print:text-xs print:text-gray-700 print:ml-7">{subtitle}</p>
    </div>
  );
}

export default function CookSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);

  // Results are keyed by what they were fetched for, so "loading" is derived
  // state instead of a flag reset inside the effect
  const [miseResult, setMiseResult] = useState<{ key: string; plan: MisePlan | null } | null>(null);
  const [sheetResult, setSheetResult] = useState<{
    id: string;
    plan: CookSheetPlan | null;
    error: string;
  } | null>(null);

  const [miseChecked, setMiseChecked] = useState<Set<string>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Recipe not found');
        setRecipe(await response.json());
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load recipe'))
      .finally(() => setLoading(false));
  }, [id]);

  // The merge tree is scale-independent; fetch once per recipe
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/recipes/${id}/cook-sheet`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data?.error === 'string' ? data.error : 'Failed to build cook sheet'
          );
        }
        if (!cancelled) setSheetResult({ id, plan: data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setSheetResult({
            id,
            plan: null,
            error: err instanceof Error ? err.message : 'Failed to build cook sheet',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The mise plan bakes scaled quantities into its text, so refetch on scale
  const miseKey = `${id}:${scale}`;
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/recipes/${id}/mise-en-place?scale=${scale}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const plan = await response.json();
        if (!cancelled) setMiseResult({ key: `${id}:${scale}`, plan });
      })
      .catch(() => {
        if (!cancelled) setMiseResult({ key: `${id}:${scale}`, plan: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id, scale]);

  const miseLoading = miseResult?.key !== miseKey;
  const misePlan = miseLoading ? null : miseResult!.plan;
  const miseFailed = !miseLoading && miseResult!.plan === null;

  const sheetLoading = sheetResult?.id !== id;
  const sheetPlan = sheetLoading ? null : sheetResult!.plan;
  const sheetError = sheetLoading ? '' : sheetResult!.error;

  const layout = useMemo(
    () => (sheetPlan ? layoutCookSheet(sheetPlan.tree) : null),
    [sheetPlan]
  );

  const toggleMise = (key: string) => {
    setMiseChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleStep = (cellId: number) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) next.delete(cellId);
      else next.add(cellId);
      return next;
    });
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

  const renderCheckItem = (key: string, label: string) => (
    <label key={key} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer print:text-xs print:text-black">
      <input
        type="checkbox"
        checked={miseChecked.has(key)}
        onChange={() => toggleMise(key)}
        className="mt-0.5 w-4 h-4 flex-none accent-blue-600 print:w-3 print:h-3"
      />
      <span className={miseChecked.has(key) ? 'text-gray-400 line-through print:text-black print:no-underline' : ''}>
        {label}
      </span>
    </label>
  );

  const renderStepCell = (cell: SheetCell) => {
    const done = doneSteps.has(cell.id);
    return (
      <td
        key={cell.id}
        rowSpan={cell.rowSpan}
        colSpan={cell.colSpan}
        onClick={() => toggleStep(cell.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleStep(cell.id);
          }
        }}
        tabIndex={0}
        role="button"
        aria-pressed={done}
        className={`border border-gray-300 px-3 py-2 text-center align-middle cursor-pointer transition-colors min-w-[110px] print:min-w-0 print:px-1.5 print:py-1 print:border-gray-500 print:bg-white ${
          done ? 'bg-green-50 hover:bg-green-100' : 'bg-blue-50 hover:bg-blue-100'
        }`}
      >
        <span
          className={`block font-semibold print:text-black print:no-underline ${
            done ? 'text-green-700 line-through' : 'text-blue-900'
          }`}
        >
          {cell.action}
          {done && <span className="no-underline"> ✓</span>}
        </span>
        {cell.time && <span className="text-xs text-gray-500 print:text-gray-700">{cell.time}</span>}
      </td>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <PageHeader
        title={recipe.name}
        back={{ label: 'Back to recipe', href: `/recipes/${id}` }}
        actions={
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="pointer-events-none">Print</span>
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        {/* Print-only header */}
        <div className="hidden print:block mb-3">
          <h1 className="text-xl font-bold text-black mb-1">{recipe.name}</h1>
          <div className="flex gap-3 text-xs text-gray-700 border-b border-gray-300 pb-1">
            {recipe.total_time && <span>Total time: {recipe.total_time} min</span>}
            {recipe.servings && (
              <span>Servings: {scale === 1 ? recipe.servings : scaleIngredient(recipe.servings, scale)}</span>
            )}
            {scale !== 1 && <span>Scaled {scale}×</span>}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
          <div className="flex items-center gap-1" role="group" aria-label="Scale recipe">
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
          <p className="text-xs text-gray-400">
            Check off prep and tap step cells as you cook — or print the whole sheet
          </p>
        </div>

        {/* Part 1: Mise en Place */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6 print:shadow-none print:p-0 print:mb-4 print:break-inside-avoid">
          <SectionHeading
            number="1"
            title="Mise en Place"
            subtitle="Everything prepped and in its container before the heat goes on."
          />

          {miseLoading ? (
            <div className="flex items-center gap-3 text-gray-500 py-6">
              <Spinner className="h-5 w-5" />
              <span>Organizing your mise en place...</span>
            </div>
          ) : misePlan ? (
            <>
              {misePlan.setup.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 print:px-2 print:py-1.5 print:mb-2 print:border-gray-400 print:bg-white">
                  <p className="text-sm font-semibold text-amber-800 mb-1.5 print:text-black print:text-xs">
                    Before you start
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                    {misePlan.setup.map((task, i) => renderCheckItem(`setup:${i}`, task))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                {misePlan.groups.map((group, gi) => (
                  <div
                    key={gi}
                    className="border border-gray-200 rounded-lg p-3.5 print:p-2 print:border-gray-400 print:break-inside-avoid"
                  >
                    <p className="text-sm font-bold text-gray-900 mb-2 print:text-xs print:text-black print:mb-1">
                      {group.title}
                    </p>
                    <div className="space-y-1.5 print:space-y-0.5">
                      {group.items.map((item, ii) => renderCheckItem(`g${gi}:${ii}`, item))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {miseFailed && (
                <p className="text-sm text-gray-400 mb-3 print:hidden">
                  Couldn&apos;t organize the prep into bowls — here&apos;s the plain list.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 print:grid-cols-2">
                {recipe.ingredients.map((ing, i) =>
                  renderCheckItem(`plain:${i}`, scaleIngredient(ing, scale))
                )}
              </div>
            </>
          )}
        </section>

        {/* Part 2: Directions */}
        <section className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:p-0 print:break-inside-avoid">
          <SectionHeading
            number="2"
            title="Directions"
            subtitle="Read left to right. A cell spanning several rows means those ingredients combine at that step."
          />

          {sheetLoading ? (
            <div className="flex items-center gap-3 text-gray-500 py-6">
              <Spinner className="h-5 w-5" />
              <span>Building the directions grid...</span>
            </div>
          ) : layout ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[720px] print:min-w-0 print:text-[10px]">
                <tbody>
                  {layout.ingredientRows.map((ingIdx, row) => (
                    <tr key={row}>
                      <td className="border border-gray-300 bg-gray-50 px-3 py-2 align-middle font-medium text-gray-800 min-w-[180px] max-w-[280px] print:min-w-0 print:max-w-none print:px-1.5 print:py-1 print:border-gray-500 print:bg-gray-100 print:text-black">
                        {scaleIngredient(recipe.ingredients[ingIdx] ?? '', scale)}
                      </td>
                      {layout.rows[row].map((cell) =>
                        cell.kind === 'step' ? (
                          renderStepCell(cell)
                        ) : (
                          <td
                            key={cell.id}
                            colSpan={cell.colSpan}
                            className="border border-gray-300 px-3 align-middle print:border-gray-500"
                            aria-hidden="true"
                          >
                            <div className="border-t border-dashed border-gray-300 print:border-gray-500" />
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-3 print:hidden">
                {sheetError || 'Couldn’t build the grid for this recipe'} — here are the classic directions.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm print:text-xs print:text-black print:space-y-1">
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
