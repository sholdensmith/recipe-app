import { Recipe } from '../db';
import { CLAUDE_MODEL, getClient } from './client';

export interface MealContext {
  currentItems: Array<{
    type: 'recipe' | 'simple';
    name: string;
    category?: string;
    cuisine?: string;
  }>;
  servings?: string;
}

export type MenuSlot =
  | 'main'
  | 'side'
  | 'protein'
  | 'carb'
  | 'veg'
  | 'salad'
  | 'soup'
  | 'bread'
  | 'dessert'
  | 'drink';

export interface DishSuggestion {
  name: string;
  rationale: string;
  slot: MenuSlot;
  category: string;
  searchQuery: string;
  matches?: Recipe[];
}

export async function suggestComplementaryDishes(
  context: MealContext,
  availableRecipes: Recipe[]
): Promise<DishSuggestion[]> {
  const prompt = buildSuggestionPrompt(context, availableRecipes);

  const client = getClient();

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response
  let jsonText = content.text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  const parsed = JSON.parse(jsonText);
  return parsed.suggestions || [];
}

function buildSuggestionPrompt(context: MealContext, availableRecipes: Recipe[]): string {
  const itemsList = context.currentItems
    .map(item => {
      if (item.type === 'recipe') {
        return `- ${item.name} (${item.category || 'unknown category'}, ${item.cuisine || 'unknown cuisine'})`;
      } else {
        return `- ${item.name} (simple item, ${item.category || 'unspecified'})`;
      }
    })
    .join('\n');

  const recipeCategories = [...new Set(availableRecipes.map(r => r.recipe_category).filter(Boolean))];
  const recipeCuisines = [...new Set(availableRecipes.map(r => r.recipe_cuisine).filter(Boolean))];

  const isSeedingFromSingleItem = context.currentItems.length === 1;

  const taskInstructions = isSeedingFromSingleItem
    ? `The user has chosen ONE seed dish and wants you to build a complete, balanced menu around it. Propose the OTHER dishes that complete the meal — do NOT repeat the seed dish. Look at what role the seed plays (main vs side vs salad etc.) and fill in the missing roles.`
    : `Suggest 3-5 complementary dishes to round out this meal.`;

  return `You are a meal planning assistant building a balanced menu.

Current meal items:
${itemsList || '(empty meal - suggest a complete meal)'}

Servings: ${context.servings || 'not specified'}

Available recipe categories in database: ${recipeCategories.join(', ') || 'none'}
Available cuisines in database: ${recipeCuisines.join(', ') || 'none'}

Task:
${taskInstructions}

Guidelines:
1. Aim for a balanced meal covering protein, carbohydrate/starch, and vegetables. Add a dessert or drink only if it would round things out nicely.
2. Respect cuisine compatibility — if the seed is Italian, lean Italian-friendly; if it's East Asian, stay in that family unless there's a clear reason not to.
3. Tag each suggestion with a "slot" that describes the role it plays in the menu. Use one of:
   - main      (the central protein-driven dish of the meal)
   - side      (any complementary side dish)
   - protein   (a protein item specifically — e.g. grilled chicken, tofu)
   - carb      (rice, bread, pasta, potatoes)
   - veg       (vegetable side or salad)
   - salad     (a clearly-salad side)
   - soup      (a soup)
   - bread     (bread/rolls/flatbread)
   - dessert   (sweet course)
   - drink     (beverage pairing)
   Prefer one suggestion per slot. Allow two suggestions in a single slot only if that slot is the obvious gap.
4. Cap the total list at 5 suggestions.
5. For each suggestion, write a good "searchQuery" — a short query (1-3 words) that's likely to find a matching recipe in the user's database if one exists.
6. Also keep the "category" field set to the closest recipe_category value (main, side, dessert, breakfast, bread, soup, salad, condiment, drink, snack, appetizer).

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Garlic Bread",
      "rationale": "Complements the tomato-based pasta dish and adds a carbohydrate component",
      "slot": "carb",
      "category": "side",
      "searchQuery": "garlic bread"
    },
    {
      "name": "Caesar Salad",
      "rationale": "Adds a crisp, fresh element to balance the richness of the main",
      "slot": "salad",
      "category": "salad",
      "searchQuery": "caesar salad"
    }
  ]
}`;
}
