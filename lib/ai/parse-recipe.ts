import { Recipe } from '../db';
import { CLAUDE_MODEL, getClient } from './client';
import { parsedRecipeSchema, firstIssue } from '../validation';
import { z } from 'zod';

export type ParsedRecipe = z.infer<typeof parsedRecipeSchema>;

/** Longest recipe text we'll send to the API. */
export const MAX_RECIPE_TEXT_LENGTH = 50000;

export function buildParsePrompt(rawText: string): string {
  return `Parse this recipe text into a structured JSON format. Follow the Schema.org Recipe standard.

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
}

/**
 * Pulls a JSON object out of a model response, tolerating markdown fences
 * and prose around the JSON.
 */
export function extractJson(text: string): string {
  let jsonText = text.trim();

  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  if (!jsonText.startsWith('{')) {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  return jsonText;
}

export async function parseRecipeWithClaude(rawText: string): Promise<ParsedRecipe> {
  if (rawText.length > MAX_RECIPE_TEXT_LENGTH) {
    throw new Error(
      `Recipe text is too long (${rawText.length} characters, max ${MAX_RECIPE_TEXT_LENGTH}). Try trimming it to just the recipe.`
    );
  }

  const client = getClient();

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    // Generous ceiling so long recipes don't get truncated mid-JSON
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: buildParsePrompt(rawText),
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    throw new Error('Recipe is too long to parse in one pass. Try splitting it up.');
  }

  const content = message.content.find((block) => block.type === 'text');
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content.text));
  } catch {
    throw new Error('Could not read the parsed recipe. Please try again.');
  }

  const result = parsedRecipeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Parsed recipe was incomplete (${firstIssue(result.error)}). Please try again.`);
  }

  return result.data;
}

export async function convertParsedToRecipe(parsed: ParsedRecipe, rawText: string): Promise<Omit<Recipe, 'id'>> {
  return {
    name: parsed.name,
    description: parsed.description ?? undefined,
    prep_time: parsed.prep_time ?? undefined,
    cook_time: parsed.cook_time ?? undefined,
    total_time: parsed.total_time ?? undefined,
    servings: parsed.servings ?? undefined,
    recipe_category: parsed.recipe_category ?? undefined,
    recipe_cuisine: parsed.recipe_cuisine ?? undefined,
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
    notes: parsed.notes ?? undefined,
    raw_text: rawText,
  };
}
