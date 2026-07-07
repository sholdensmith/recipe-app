import { z } from 'zod';
import { CLAUDE_MODEL, getClient } from './client';
import { extractJson } from './parse-recipe';

export const misePlanSchema = z.object({
  setup: z.array(z.string().max(500)).max(20),
  groups: z
    .array(
      z.object({
        title: z.string().min(1).max(300),
        items: z.array(z.string().min(1).max(500)).min(1).max(50),
      })
    )
    .min(1)
    .max(30),
});

export type MisePlan = z.infer<typeof misePlanSchema>;

export async function buildMisePlan(
  name: string,
  ingredients: string[],
  instructions: string[]
): Promise<MisePlan> {
  const prompt = `You are helping a home cook set up their mise en place before starting this recipe.

Recipe: ${name}

Ingredients:
${ingredients.map((i) => `- ${i}`).join('\n')}

Instructions:
${instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Create a mise en place plan:

1. "setup": equipment and oven tasks to do before anything else (preheat oven, prepare pans, boil water), taken from the instructions. Use an empty array if there are none.
2. "groups": organize ALL the ingredients into containers.
   - Read the instructions carefully: when several ingredients are added at the same time in the same step, put them in ONE shared container so the cook dirties fewer bowls (e.g. dry ingredients that get folded in together).
   - Ingredients added at different times get their own containers.
   - "title" is a short container label plus when it's used, e.g. "Dry ingredients — one bowl (folded in at step 5)" or "Butter — saucepan (melted first)".
   - "items" has one entry per ingredient, phrased as the prep task with the measurement kept exactly as written, e.g. "Measure 1/2 cup (80 g) all-purpose flour", "Finely dice 1 yellow onion", "Crack 2 large eggs".
3. Every ingredient must appear in exactly one group. Do not invent ingredients or change quantities.
4. To-taste items (salt, pepper) that are used while cooking can go in a "Keep at the stove" group.

Return ONLY valid JSON in this exact format:
{
  "setup": ["Preheat oven to 350°F", "Butter and flour an 8x8-in pan"],
  "groups": [
    {
      "title": "Dry ingredients — one bowl (folded in at step 5)",
      "items": ["Measure 1/2 cup (80 g) all-purpose flour", "Measure 1/3 cup (80 g) cocoa powder"]
    }
  ]
}`;

  const client = getClient();

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content.find((block) => block.type === 'text');
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return misePlanSchema.parse(JSON.parse(extractJson(content.text)));
}
