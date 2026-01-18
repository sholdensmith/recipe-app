// Database adapter that routes to either SQLite (local) or Postgres (Vercel)
import type { Recipe, Meal, MealItem, MealItemWithRecipe, MealWithItems } from './index';

// Check environment
const isVercel = process.env.POSTGRES_URL !== undefined;

// Import the appropriate implementation
let dbImpl: any;

if (isVercel) {
  // Use Postgres on Vercel
  dbImpl = require('./postgres');
} else {
  // Use SQLite locally
  dbImpl = require('./index');
}

// Re-export all functions
export const insertRecipe = dbImpl.insertRecipe;
export const getAllRecipes = dbImpl.getAllRecipes;
export const getRecipeById = dbImpl.getRecipeById;
export const filterRecipes = dbImpl.filterRecipes;
export const getCategories = dbImpl.getCategories;
export const getCuisines = dbImpl.getCuisines;
export const deleteRecipe = dbImpl.deleteRecipe;

export const insertMeal = dbImpl.insertMeal;
export const getAllMeals = dbImpl.getAllMeals;
export const getMealById = dbImpl.getMealById;
export const updateMeal = dbImpl.updateMeal;
export const deleteMeal = dbImpl.deleteMeal;

export const insertMealItem = dbImpl.insertMealItem;
export const getMealItems = dbImpl.getMealItems;
export const getMealWithItems = dbImpl.getMealWithItems;
export const deleteMealItem = dbImpl.deleteMealItem;

// Re-export types
export type { Recipe, Meal, MealItem, MealItemWithRecipe, MealWithItems };
