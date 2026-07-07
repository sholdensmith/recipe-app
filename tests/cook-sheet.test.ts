import { describe, it, expect } from 'vitest';
import { normalizeCookSheet, type CookSheetNode, type CookSheetPlan } from '@/lib/ai/cook-sheet';
import { layoutCookSheet, type SheetCell } from '@/lib/cook-sheet-layout';

// Chicken tikka masala as a merge tree: a marinade/grill branch and a sauce
// branch that combine near the end, plus late-joining cream and cilantro.
// Ingredients: 0 yogurt, 1 spice, 2 chicken, 3 butter, 4 onion, 5 garlic,
// 6 ginger, 7 tomatoes, 8 cream, 9 cilantro.
const tikkaTree: CookSheetNode = {
  action: 'Garnish & serve',
  inputs: [
    {
      action: 'Combine & simmer',
      time: '10 min',
      inputs: [
        {
          action: 'Grill until charred',
          time: '8 min',
          inputs: [{ action: 'Marinate', time: '4+ hours', inputs: [0, 1, 2] }],
        },
        {
          action: 'Simmer',
          time: '15 min',
          inputs: [
            {
              action: 'Cook until fragrant',
              time: '1 min',
              inputs: [{ action: 'Sauté until soft', time: '5 min', inputs: [3, 4] }, 5, 6],
            },
            7,
          ],
        },
        8,
      ],
    },
    9,
  ],
};

function findStep(cells: SheetCell[], action: string): SheetCell {
  const cell = cells.find((c) => c.kind === 'step' && c.action === action);
  if (!cell) throw new Error(`No step cell "${action}"`);
  return cell;
}

describe('layoutCookSheet', () => {
  const layout = layoutCookSheet(tikkaTree);
  const allCells = layout.rows.flat();

  it('computes the column count from the deepest branch', () => {
    // sauté → fragrant → simmer → combine → serve
    expect(layout.stepColumns).toBe(5);
  });

  it('orders ingredient rows by tree traversal', () => {
    expect(layout.ingredientRows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('spans each combining step across its ingredients', () => {
    const marinate = findStep(allCells, 'Marinate');
    expect(marinate).toMatchObject({ row: 0, rowSpan: 3, colStart: 1, colSpan: 1 });

    const saute = findStep(allCells, 'Sauté until soft');
    expect(saute).toMatchObject({ row: 3, rowSpan: 2, colStart: 1, colSpan: 1 });

    const fragrant = findStep(allCells, 'Cook until fragrant');
    expect(fragrant).toMatchObject({ row: 3, rowSpan: 4, colStart: 2, colSpan: 1 });

    const simmer = findStep(allCells, 'Simmer');
    expect(simmer).toMatchObject({ row: 3, rowSpan: 5, colStart: 3, colSpan: 1 });
  });

  it('stretches shallow branches sideways to meet their parent', () => {
    // The grill branch is two levels shallower than the sauce branch, so its
    // cell widens to reach the combine column.
    const grill = findStep(allCells, 'Grill until charred');
    expect(grill).toMatchObject({ row: 0, rowSpan: 3, colStart: 2, colSpan: 2 });
  });

  it('merges everything into the final cells', () => {
    const combine = findStep(allCells, 'Combine & simmer');
    expect(combine).toMatchObject({ row: 0, rowSpan: 9, colStart: 4, colSpan: 1 });

    const serve = findStep(allCells, 'Garnish & serve');
    expect(serve).toMatchObject({ row: 0, rowSpan: 10, colStart: 5, colSpan: 1 });
  });

  it('emits pass cells for late-joining ingredients', () => {
    // garlic and ginger join at column 2; tomatoes at 3; cream at 4; cilantro at 5
    const passByRow = new Map(
      allCells.filter((c) => c.kind === 'pass').map((c) => [c.row, c])
    );
    expect(passByRow.get(5)).toMatchObject({ colStart: 1, colSpan: 1 });
    expect(passByRow.get(6)).toMatchObject({ colStart: 1, colSpan: 1 });
    expect(passByRow.get(7)).toMatchObject({ colStart: 1, colSpan: 2 });
    expect(passByRow.get(8)).toMatchObject({ colStart: 1, colSpan: 3 });
    expect(passByRow.get(9)).toMatchObject({ colStart: 1, colSpan: 4 });
    // Ingredients feeding a column-1 step need no pass cell
    expect(passByRow.get(0)).toBeUndefined();
    expect(passByRow.get(3)).toBeUndefined();
  });

  it('keeps every row and column accounted for', () => {
    // Every table row's cells (including spans from earlier rows) must cover
    // exactly stepColumns columns — the invariant that makes rowspan
    // rendering valid HTML.
    const coverage: number[] = Array.from({ length: layout.ingredientRows.length }, () => 0);
    for (const cell of allCells) {
      for (let r = cell.row; r < cell.row + cell.rowSpan; r++) {
        coverage[r] += cell.colSpan;
      }
    }
    for (const covered of coverage) {
      expect(covered).toBe(layout.stepColumns);
    }
  });

  it('handles a recipe with a single flat step', () => {
    const flat = layoutCookSheet({ action: 'Toss together', inputs: [0, 1, 2] });
    expect(flat.stepColumns).toBe(1);
    expect(flat.ingredientRows).toEqual([0, 1, 2]);
    const toss = findStep(flat.rows.flat(), 'Toss together');
    expect(toss).toMatchObject({ row: 0, rowSpan: 3, colStart: 1, colSpan: 1 });
    expect(flat.rows.flat().filter((c) => c.kind === 'pass')).toHaveLength(0);
  });
});

describe('normalizeCookSheet', () => {
  it('accepts a plan that uses every ingredient exactly once', () => {
    const plan: CookSheetPlan = { tree: tikkaTree };
    expect(normalizeCookSheet(plan, 10)).toBe(plan);
  });

  it('attaches forgotten ingredients to the final step', () => {
    const plan: CookSheetPlan = {
      tree: { action: 'Bake', inputs: [{ action: 'Mix', inputs: [0, 1] }] },
    };
    const fixed = normalizeCookSheet(plan, 4);
    expect(fixed.tree.inputs).toEqual([{ action: 'Mix', inputs: [0, 1] }, 2, 3]);
    // The repaired tree still lays out with all ingredients present
    expect(layoutCookSheet(fixed.tree).ingredientRows).toEqual([0, 1, 2, 3]);
  });

  it('rejects duplicate ingredient references', () => {
    const plan: CookSheetPlan = {
      tree: { action: 'Mix', inputs: [0, { action: 'Whisk', inputs: [0, 1] }] },
    };
    expect(() => normalizeCookSheet(plan, 2)).toThrow(/more than once/);
  });

  it('rejects out-of-range ingredient references', () => {
    const plan: CookSheetPlan = { tree: { action: 'Mix', inputs: [0, 5] } };
    expect(() => normalizeCookSheet(plan, 2)).toThrow(/unknown ingredient/);
  });

  it('rejects trees too deep to render', () => {
    let tree: CookSheetNode = { action: 'Step', inputs: [0] };
    for (let i = 1; i <= 13; i++) {
      tree = { action: `Step ${i}`, inputs: [tree, i] };
    }
    expect(() => normalizeCookSheet({ tree }, 14)).toThrow(/too deep/);
  });
});
