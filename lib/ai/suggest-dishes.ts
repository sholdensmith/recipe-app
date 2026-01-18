import Anthropic from '@anthropic-ai/sdk';
import { Recipe } from '../db';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

export interface MealContext {
  currentItems: Array<{
    type: 'recipe' | 'simple';
    name: string;
    category?: string;
    cuisine?: string;
  }>;
  servings?: string;
}

export interface DishSuggestion {
  name: string;
  rationale: string;
  category: string;
  searchQuery: string;
}

export async function suggestComplementaryDishes(
  context: MealContext,
  availableRecipes: Recipe[]
): Promise<DishSuggestion[]> {
  const prompt = buildSuggestionPrompt(context, availableRecipes);

  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
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

  return `You are a meal planning assistant. Analyze the current meal and suggest 3-5 complementary dishes to create a balanced, cohesive meal.

Current meal items:
${itemsList || '(empty meal - suggest a complete meal)'}

Servings: ${context.servings || 'not specified'}

Available recipe categories in database: ${recipeCategories.join(', ') || 'none'}
Available cuisines in database: ${recipeCuisines.join(', ') || 'none'}

Guidelines:
1. For BALANCED meals, suggest items that provide:
   - Protein (if missing)
   - Carbohydrate/starch (if missing)
   - Vegetables (if missing)
   - Consider cultural/cuisine compatibility

2. For CONTEXTUAL suggestions:
   - If there's a hearty stew/soup → suggest bread or rice
   - If there's a main protein → suggest appropriate sides
   - If there's Italian cuisine → suggest Italian-compatible sides
   - If meal is incomplete → suggest core components

3. Prioritize suggestions that match recipes in the database categories/cuisines listed above

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Garlic Bread",
      "rationale": "Complements the tomato-based pasta dish and adds a carbohydrate component",
      "category": "side",
      "searchQuery": "garlic bread"
    },
    {
      "name": "Green Salad",
      "rationale": "Adds fresh vegetables to balance the richness of the main dish",
      "category": "veggie",
      "searchQuery": "salad green"
    }
  ]
}`;
}
