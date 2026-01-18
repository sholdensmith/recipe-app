// Export all types
export type { Recipe, Meal, MealItem, MealItemWithRecipe, MealWithItems } from './postgres';

// Check if we're using Vercel Postgres
const isVercel = process.env.POSTGRES_URL !== undefined;

// Re-export all functions from the appropriate implementation
if (isVercel) {
  export * from './postgres';
} else {
  export * from './sqlite';
}
