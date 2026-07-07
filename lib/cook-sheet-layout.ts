import type { CookSheetNode } from './ai/cook-sheet';

/**
 * Turns a cook-sheet merge tree into renderable table geometry.
 *
 * Column model: column 0 is the ingredient column (implicit); step columns
 * are 1-based. A node's cell starts at its depth (longest path from a leaf)
 * and stretches right until its parent's column, so sibling branches of
 * different depths still meet their parent in the same column. Leaves that
 * feed a deep step get a "pass" cell spanning the gap.
 */

export interface SheetCell {
  kind: 'step' | 'pass';
  /** Stable per-plan id, assigned in pre-order; used for check-off state. */
  id: number;
  action?: string;
  time?: string;
  row: number;
  rowSpan: number;
  colStart: number;
  colSpan: number;
}

export interface CookSheetLayout {
  stepColumns: number;
  /** Ingredient index (into the recipe's ingredient list) for each display row. */
  ingredientRows: number[];
  /** Step/pass cells that START at each row, ordered left to right. */
  rows: SheetCell[][];
}

function depth(node: CookSheetNode): number {
  let max = 0;
  for (const input of node.inputs) {
    if (typeof input !== 'number') {
      max = Math.max(max, depth(input));
    }
  }
  return max + 1;
}

function leafCount(node: CookSheetNode): number {
  let count = 0;
  for (const input of node.inputs) {
    count += typeof input === 'number' ? 1 : leafCount(input);
  }
  return count;
}

export function layoutCookSheet(tree: CookSheetNode): CookSheetLayout {
  const stepColumns = depth(tree);
  const ingredientRows: number[] = [];
  const cells: SheetCell[] = [];
  let nextId = 0;

  // parentColStart is the column where this node's parent begins; the node's
  // cell fills everything between its own depth and that column.
  const visit = (node: CookSheetNode, parentColStart: number): void => {
    const colStart = depth(node);
    const row = ingredientRows.length;

    cells.push({
      kind: 'step',
      id: nextId++,
      action: node.action,
      time: node.time,
      row,
      rowSpan: leafCount(node),
      colStart,
      colSpan: parentColStart - colStart,
    });

    for (const input of node.inputs) {
      if (typeof input === 'number') {
        if (colStart > 1) {
          cells.push({
            kind: 'pass',
            id: nextId++,
            row: ingredientRows.length,
            rowSpan: 1,
            colStart: 1,
            colSpan: colStart - 1,
          });
        }
        ingredientRows.push(input);
      } else {
        visit(input, colStart);
      }
    }
  };
  visit(tree, stepColumns + 1);

  const rows: SheetCell[][] = ingredientRows.map(() => []);
  for (const cell of cells) {
    rows[cell.row].push(cell);
  }
  for (const row of rows) {
    row.sort((a, b) => a.colStart - b.colStart);
  }

  return { stepColumns, ingredientRows, rows };
}
