import { z } from 'zod';
import { CLAUDE_MODEL, getClient } from './client';
import { extractJson } from './parse-recipe';

/**
 * Cook sheet: a "Cooking for Engineers"-style merge tree. Leaves are
 * ingredient indexes; nodes are cooking actions that combine their inputs.
 * The root is the final step that yields the finished dish.
 */
export interface CookSheetNode {
  action: string;
  time?: string;
  inputs: (number | CookSheetNode)[];
}

const nodeSchema: z.ZodType<CookSheetNode> = z.lazy(() =>
  z.object({
    action: z.string().min(1).max(200),
    time: z.string().max(100).optional(),
    inputs: z
      .array(z.union([z.number().int().min(0), nodeSchema]))
      .min(1)
      .max(40),
  })
);

export const cookSheetSchema = z.object({ tree: nodeSchema });

export type CookSheetPlan = z.infer<typeof cookSheetSchema>;

/** Longest path from a node down to an ingredient leaf. */
function treeDepth(node: CookSheetNode): number {
  let max = 0;
  for (const input of node.inputs) {
    if (typeof input !== 'number') {
      max = Math.max(max, treeDepth(input));
    }
  }
  return max + 1;
}

// Deeper than this and the printed table becomes unreadable
const MAX_DEPTH = 12;

/**
 * Validates leaf indexes against the recipe's ingredient list and repairs
 * small model mistakes: ingredients the tree forgot are attached to the
 * final step so every ingredient still gets a row. Duplicate or
 * out-of-range indexes are unrecoverable and throw.
 */
export function normalizeCookSheet(plan: CookSheetPlan, ingredientCount: number): CookSheetPlan {
  const seen = new Set<number>();

  const visit = (node: CookSheetNode) => {
    for (const input of node.inputs) {
      if (typeof input === 'number') {
        if (input >= ingredientCount) {
          throw new Error(`Cook sheet references unknown ingredient ${input}`);
        }
        if (seen.has(input)) {
          throw new Error(`Cook sheet uses ingredient ${input} more than once`);
        }
        seen.add(input);
      } else {
        visit(input);
      }
    }
  };
  visit(plan.tree);

  if (treeDepth(plan.tree) > MAX_DEPTH) {
    throw new Error('Cook sheet tree is too deep to render');
  }

  const missing: number[] = [];
  for (let i = 0; i < ingredientCount; i++) {
    if (!seen.has(i)) missing.push(i);
  }
  if (missing.length === 0) return plan;

  return {
    tree: {
      ...plan.tree,
      inputs: [...plan.tree.inputs, ...missing],
    },
  };
}

export async function buildCookSheet(
  name: string,
  ingredients: string[],
  instructions: string[]
): Promise<CookSheetPlan> {
  const prompt = `You are converting a recipe into a "Cooking for Engineers"-style preparation table: ingredients run down the left edge, and cooking steps combine them left to right until everything merges into the finished dish.

Recipe: ${name}

Ingredients (referenced by index):
${ingredients.map((ing, i) => `${i}. ${ing}`).join('\n')}

Instructions:
${instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Build the merge tree for this recipe:
- A leaf is an ingredient index (a plain integer).
- A node is one cooking action: {"action": "...", "time": "...", "inputs": [...]}. Its inputs are the ingredients and/or earlier steps it combines.
- "action" is a short imperative phrase of 2-6 words, e.g. "Sauté until soft" or "Whisk together". Put durations and temperatures in "time" (e.g. "5 min", "375°F, 25 min"); omit "time" when there is none.
- Follow the instructions faithfully. Sequential steps nest (the earlier step becomes an input of the later one). Independent components — a marinade, a sauce, a dry mix — stay separate branches until the step where they actually combine.
- Every ingredient index appears exactly once in the whole tree. If an ingredient is used at several points, attach it where it is FIRST used and mention the split in that action's text. Do not invent or skip ingredients.
- An ingredient added late (a garnish, a finishing swirl) is simply an input of that late step.
- Order each node's inputs the way the ingredients are used, so the table rows read naturally top to bottom.
- The root node is the final step that yields the finished dish.
- Keep it readable: at most 6 levels of nesting from ingredient to finished dish.

Return ONLY valid JSON in this exact shape:
{"tree": {"action": "Garnish and serve", "inputs": [{"action": "Simmer", "time": "10 min", "inputs": [0, 1]}, 2]}}`;

  const client = getClient();

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content.find((block) => block.type === 'text');
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const plan = cookSheetSchema.parse(JSON.parse(extractJson(content.text)));
  return normalizeCookSheet(plan, ingredients.length);
}
