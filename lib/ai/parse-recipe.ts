import Anthropic from '@anthropic-ai/sdk';
import { Recipe } from '../db';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({
    apiKey: apiKey,
  });
}

export interface ParsedRecipe {
  name: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  servings?: string;
  recipe_category?: string;
  recipe_cuisine?: string;
  ingredients: string[];
  instructions: string[];
  notes?: string;
}

export async function parseRecipeWithClaude(rawText: string): Promise<ParsedRecipe> {
  const prompt = `Parse this recipe text into a structured JSON format. Follow the Schema.org Recipe standard.

Extract the following fields:
- name: Recipe title
- description: Brief intro/description (optional)
- prep_time: Preparation time in minutes (optional, number only)
- cook_time: Cooking time in minutes (optional, number only)
- total_time: Total time in minutes (optional, number only)
- servings: Number of servings as a string (e.g., "4", "6-8 servings")
- recipe_category: Type of dish - choose the MOST SPECIFIC category that applies:
  * "main" - Main course dishes (entrees, casseroles, etc.)
  * "side" - Side dishes (roasted vegetables, rice dishes, etc.)
  * "appetizer" - Appetizers and starters
  * "dessert" - Desserts and sweets
  * "breakfast" - Breakfast dishes
  * "bread" - Bread, rolls, biscuits, muffins, and other baked goods
  * "soup" - Soups, stews, and chilis (NOT main course, even if hearty)
  * "salad" - Salads (NOT side, even if served as one)
  * "condiment" - Sauces, dressings, spreads, salsas, and condiments (NOT side)
  * "drink" - Beverages and cocktails
  * "snack" - Snacks and small bites
- recipe_cuisine: Cuisine type - use SPECIFIC cuisines when possible (e.g., "Japanese" not "Asian", "Italian" not "European"):
  * Asian cuisines: Japanese, Chinese, Thai, Korean, Vietnamese, Indian, Filipino, etc.
  * European cuisines: Italian, French, Spanish, Greek, German, British, etc.
  * Americas: Mexican, American, Brazilian, Peruvian, etc.
  * Middle Eastern: Lebanese, Turkish, Israeli, etc.
  * African cuisines: Ethiopian, Moroccan, etc.
  * Only use broad terms like "Asian" or "European" if the recipe is a fusion or doesn't fit a specific country
- ingredients: Array of ingredient strings, each on a separate line as written
- instructions: Array of step strings, numbered or separated
- notes: Any additional notes, tips, or variations (optional)

Return ONLY valid JSON in this exact format:
{
  "name": "Recipe Name",
  "description": "Optional description",
  "prep_time": 15,
  "cook_time": 30,
  "total_time": 45,
  "servings": "4 servings",
  "recipe_category": "bread",
  "recipe_cuisine": "Italian",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["Step 1", "Step 2"],
  "notes": "Optional notes"
}

Recipe text:
${rawText}`;

  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
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

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonText = content.text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  const parsed: ParsedRecipe = JSON.parse(jsonText);

  // Validate required fields
  if (!parsed.name || !parsed.ingredients || !parsed.instructions) {
    throw new Error('Parsed recipe missing required fields (name, ingredients, or instructions)');
  }

  return parsed;
}

export async function convertParsedToRecipe(parsed: ParsedRecipe, rawText: string): Promise<Omit<Recipe, 'id'>> {
  return {
    name: parsed.name,
    description: parsed.description,
    prep_time: parsed.prep_time,
    cook_time: parsed.cook_time,
    total_time: parsed.total_time,
    servings: parsed.servings,
    recipe_category: parsed.recipe_category,
    recipe_cuisine: parsed.recipe_cuisine,
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
    notes: parsed.notes,
    raw_text: rawText,
  };
}
