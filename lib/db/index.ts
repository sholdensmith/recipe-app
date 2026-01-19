// Export all types
export type { Recipe, Meal, MealItem, MealItemWithRecipe, MealWithItems } from './types';

// Check if we're using Vercel Postgres
const isVercel = process.env.POSTGRES_URL !== undefined;

// Import both implementations
import * as postgres from './postgres';
import * as sqlite from './sqlite';

// Re-export based on environment
const db = isVercel ? postgres : sqlite;

export const getAllRecipes = db.getAllRecipes;
export const getRecipeById = db.getRecipeById;
export const insertRecipe = db.insertRecipe;
export const updateRecipe = db.updateRecipe;
export const deleteRecipe = db.deleteRecipe;
export const filterRecipes = db.filterRecipes;
export const getCategories = db.getCategories;
export const getCuisines = db.getCuisines;

export const getAllMeals = db.getAllMeals;
export const getMealById = db.getMealById;
export const insertMeal = db.insertMeal;
export const updateMeal = db.updateMeal;
export const deleteMeal = db.deleteMeal;
export const getMealWithItems = db.getMealWithItems;

export const getMealItems = db.getMealItems;
export const insertMealItem = db.insertMealItem;
export const deleteMealItem = db.deleteMealItem;
