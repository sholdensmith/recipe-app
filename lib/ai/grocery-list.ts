import { z } from 'zod';
import { CLAUDE_MODEL, getClient } from './client';
import { extractJson } from './parse-recipe';

export const GROCERY_CATEGORIES = [
  'produce',
  'meat & seafood',
  'dairy & eggs',
  'bakery',
  'pantry',
  'spices',
  'frozen',
  'drinks',
  'other',
] as const;

const groceryItemSchema = z.object({
  name: z.string().min(1).max(300),
  quantity: z.string().max(100).nullish(),
  category: z.string().max(50).transform((c) => {
    const normalized = c.toLowerCase().trim();
    return (GROCERY_CATEGORIES as readonly string[]).includes(normalized) ? normalized : 'other';
  }),
});

const groceryListSchema = z.object({
  items: z.array(groceryItemSchema).min(1).max(300),
});

export type GroceryItem = z.infer<typeof groceryItemSchema>;

export interface GroceryDish {
  name: string;
  ingredients: string[];
}

export async function consolidateGroceryList(dishes: GroceryDish[]): Promise<GroceryItem[]> {
  const dishList = dishes
    .map((dish) =>
      dish.ingredients.length > 0
        ? `## ${dish.name}\n${dish.ingredients.map((i) => `- ${i}`).join('\n')}`
        : `## ${dish.name}\n(no ingredient list — include the item itself)`
    )
    .join('\n\n');

  const prompt = `Combine the ingredients from these dishes into one grocery shopping list.

${dishList}

Rules:
1. Merge duplicate ingredients across dishes. Sum quantities when the units are compatible (e.g. "1 cup butter" + "4 tbsp butter" → "1 1/4 cups butter"). If units can't be combined, list both quantities (e.g. "2 lbs + 1 cup").
2. Use a short shoppable name for each item ("yellow onion", not "1 large yellow onion, finely diced").
3. Put the amount in "quantity" (e.g. "2 lbs", "3", "1 1/2 cups"). Omit it for to-taste items.
4. Assign each item to exactly one category from this list: ${GROCERY_CATEGORIES.join(', ')}.
5. Water is not a grocery item. Salt and pepper go in spices.
6. Dishes with no ingredient list are simple store-bought items — include them as-is in the most fitting category.

Return ONLY valid JSON in this exact format:
{
  "items": [
    { "name": "yellow onion", "quantity": "2", "category": "produce" },
    { "name": "unsalted butter", "quantity": "1 1/4 cups", "category": "dairy & eggs" }
  ]
}`;

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

  const parsed = groceryListSchema.parse(JSON.parse(extractJson(content.text)));
  return parsed.items;
}
