import { z } from 'zod';

// Coerces `true`/`false` or 0/1 into the 0/1 the DB layer expects
const dbBoolean = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((v) => (v ? 1 : 0));

const optionalMinutes = z.number().int().min(0).max(100000).nullish();
const optionalText = z.string().max(20000).nullish();
const optionalShortText = z.string().max(500).nullish();

export const recipeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required').max(300),
  description: optionalText,
  author: optionalShortText,
  prep_time: optionalMinutes,
  cook_time: optionalMinutes,
  total_time: optionalMinutes,
  servings: optionalShortText,
  recipe_yield: optionalShortText,
  recipe_category: optionalShortText,
  recipe_cuisine: optionalShortText,
  ingredients: z.array(z.string().max(1000)).min(1, 'At least one ingredient is required').max(200),
  instructions: z.array(z.string().max(5000)).min(1, 'At least one instruction is required').max(200),
  notes: optionalText,
  image_url: optionalShortText,
  source_url: optionalShortText,
  raw_text: z.string().max(100000).nullish(),
});

export const recipePatchSchema = recipeCreateSchema
  .partial()
  .extend({
    is_favorite: dbBoolean.optional(),
    is_fan_favorite: dbBoolean.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const mealCreateSchema = z.object({
  name: z.string().trim().min(1, 'Meal name is required').max(300),
  servings: optionalShortText,
  notes: optionalText,
});

export const mealPatchSchema = mealCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const mealItemCreateSchema = z
  .object({
    item_type: z.enum(['recipe', 'simple']),
    recipe_id: z.number().int().positive().nullish(),
    simple_item_name: optionalShortText,
    simple_item_category: optionalShortText,
    order_index: z.number().int().min(0).default(0),
  })
  .refine((item) => item.item_type !== 'recipe' || item.recipe_id != null, {
    message: 'recipe_id required for recipe items',
  })
  .refine((item) => item.item_type !== 'simple' || !!item.simple_item_name, {
    message: 'simple_item_name required for simple items',
  });

export const mealItemPatchSchema = z
  .object({
    simple_item_name: optionalShortText,
    simple_item_category: optionalShortText,
    order_index: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

/** Shape the AI parser must return; also validates AI output before saving. */
export const parsedRecipeSchema = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().max(20000).nullish(),
  prep_time: z.number().int().min(0).nullish(),
  cook_time: z.number().int().min(0).nullish(),
  total_time: z.number().int().min(0).nullish(),
  servings: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .nullish(),
  recipe_category: z.string().max(100).nullish(),
  recipe_cuisine: z.string().max(100).nullish(),
  ingredients: z.array(z.string().max(1000)).min(1),
  instructions: z.array(z.string().max(5000)).min(1),
  notes: z.string().max(20000).nullish(),
});

/** Returns the first zod issue as a readable message. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request';
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}
