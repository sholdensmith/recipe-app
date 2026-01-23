import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Recipe {
  id?: number;
  name: string;
  description?: string;
  author?: string;
  date_published?: string;
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  servings?: string;
  recipe_yield?: string;
  recipe_category?: string;
  recipe_cuisine?: string;
  ingredients: string[]; // Will be stored as JSON
  instructions: string[]; // Will be stored as JSON
  notes?: string;
  image_url?: string;
  source_url?: string;
  raw_text?: string;
  is_favorite?: boolean | number; // boolean for Postgres, 0/1 for SQLite
  created_at?: string;
  updated_at?: string;
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = join(process.cwd(), 'recipes.db');
    db = new Database(dbPath);

    // Initialize schema
    const schema = readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf-8');
    db.exec(schema);
  }
  return db;
}

export function insertRecipe(recipe: Recipe): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO recipes (
      name, description, author, prep_time, cook_time, total_time,
      servings, recipe_yield, recipe_category, recipe_cuisine,
      ingredients, instructions, notes, image_url, source_url, raw_text
    ) VALUES (
      @name, @description, @author, @prep_time, @cook_time, @total_time,
      @servings, @recipe_yield, @recipe_category, @recipe_cuisine,
      @ingredients, @instructions, @notes, @image_url, @source_url, @raw_text
    )
  `);

  const result = stmt.run({
    name: recipe.name,
    description: recipe.description || null,
    author: recipe.author || null,
    prep_time: recipe.prep_time || null,
    cook_time: recipe.cook_time || null,
    total_time: recipe.total_time || null,
    servings: recipe.servings || null,
    recipe_yield: recipe.recipe_yield || null,
    recipe_category: recipe.recipe_category || null,
    recipe_cuisine: recipe.recipe_cuisine || null,
    ingredients: JSON.stringify(recipe.ingredients),
    instructions: JSON.stringify(recipe.instructions),
    notes: recipe.notes || null,
    image_url: recipe.image_url || null,
    source_url: recipe.source_url || null,
    raw_text: recipe.raw_text || null,
  });

  return result.lastInsertRowid as number;
}

export function getAllRecipes(): Recipe[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC');
  const rows = stmt.all() as any[];

  return rows.map(row => ({
    ...row,
    ingredients: JSON.parse(row.ingredients),
    instructions: JSON.parse(row.instructions),
  }));
}

export function getRecipeById(id: number): Recipe | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM recipes WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    ...row,
    ingredients: JSON.parse(row.ingredients),
    instructions: JSON.parse(row.instructions),
  };
}

export function searchRecipesByIngredient(ingredient: string): Recipe[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT recipes.* FROM recipes
    JOIN recipes_fts ON recipes.id = recipes_fts.rowid
    WHERE recipes_fts.ingredients MATCH ?
    ORDER BY rank
  `);

  const rows = stmt.all(ingredient) as any[];

  return rows.map(row => ({
    ...row,
    ingredients: JSON.parse(row.ingredients),
    instructions: JSON.parse(row.instructions),
  }));
}

export function filterRecipes(filters: {
  category?: string;
  cuisine?: string;
  cuisines?: string[]; // Support multiple cuisines for hierarchy filtering
  search?: string;
  favorites?: boolean;
}): Recipe[] {
  const db = getDb();
  let query = 'SELECT * FROM recipes WHERE 1=1';
  const params: any[] = [];

  if (filters.favorites) {
    query += ' AND is_favorite = 1';
  }

  if (filters.category) {
    query += ' AND recipe_category = ?';
    params.push(filters.category);
  }

  if (filters.cuisines && filters.cuisines.length > 0) {
    // Support filtering by multiple cuisines (for parent cuisine matching)
    const placeholders = filters.cuisines.map(() => '?').join(', ');
    query += ` AND recipe_cuisine IN (${placeholders})`;
    params.push(...filters.cuisines);
  } else if (filters.cuisine) {
    query += ' AND recipe_cuisine = ?';
    params.push(filters.cuisine);
  }

  if (filters.search) {
    // Add prefix wildcard for partial matching (e.g., "bulg" matches "bulgur")
    const searchTerm = filters.search.trim() + '*';

    const favoritesFilter = filters.favorites ? 'AND is_favorite = 1' : '';
    const categoryFilter = filters.category ? 'AND recipe_category = ?' : '';
    const cuisineFilter = filters.cuisines && filters.cuisines.length > 0
      ? `AND recipe_cuisine IN (${filters.cuisines.map(() => '?').join(', ')})`
      : filters.cuisine ? 'AND recipe_cuisine = ?' : '';

    query = `
      SELECT recipes.* FROM recipes
      JOIN recipes_fts ON recipes.id = recipes_fts.rowid
      WHERE recipes_fts MATCH ?
      ${favoritesFilter}
      ${categoryFilter}
      ${cuisineFilter}
      ORDER BY rank
    `;
    params.unshift(searchTerm);
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    ingredients: JSON.parse(row.ingredients),
    instructions: JSON.parse(row.instructions),
  }));
}

export function getCategories(): string[] {
  const db = getDb();
  const stmt = db.prepare('SELECT DISTINCT recipe_category FROM recipes WHERE recipe_category IS NOT NULL ORDER BY recipe_category');
  return stmt.all().map((row: any) => row.recipe_category);
}

export function getCuisines(): string[] {
  const db = getDb();
  const stmt = db.prepare('SELECT DISTINCT recipe_cuisine FROM recipes WHERE recipe_cuisine IS NOT NULL ORDER BY recipe_cuisine');
  return stmt.all().map((row: any) => row.recipe_cuisine);
}

export function updateRecipe(id: number, recipe: Partial<Recipe>): boolean {
  const db = getDb();
  const updates: string[] = [];
  const params: any = { id };

  if (recipe.name !== undefined) {
    updates.push('name = @name');
    params.name = recipe.name;
  }
  if (recipe.description !== undefined) {
    updates.push('description = @description');
    params.description = recipe.description;
  }
  if (recipe.author !== undefined) {
    updates.push('author = @author');
    params.author = recipe.author;
  }
  if (recipe.prep_time !== undefined) {
    updates.push('prep_time = @prep_time');
    params.prep_time = recipe.prep_time;
  }
  if (recipe.cook_time !== undefined) {
    updates.push('cook_time = @cook_time');
    params.cook_time = recipe.cook_time;
  }
  if (recipe.total_time !== undefined) {
    updates.push('total_time = @total_time');
    params.total_time = recipe.total_time;
  }
  if (recipe.servings !== undefined) {
    updates.push('servings = @servings');
    params.servings = recipe.servings;
  }
  if (recipe.recipe_yield !== undefined) {
    updates.push('recipe_yield = @recipe_yield');
    params.recipe_yield = recipe.recipe_yield;
  }
  if (recipe.recipe_category !== undefined) {
    updates.push('recipe_category = @recipe_category');
    params.recipe_category = recipe.recipe_category;
  }
  if (recipe.recipe_cuisine !== undefined) {
    updates.push('recipe_cuisine = @recipe_cuisine');
    params.recipe_cuisine = recipe.recipe_cuisine;
  }
  if (recipe.ingredients !== undefined) {
    updates.push('ingredients = @ingredients');
    params.ingredients = JSON.stringify(recipe.ingredients);
  }
  if (recipe.instructions !== undefined) {
    updates.push('instructions = @instructions');
    params.instructions = JSON.stringify(recipe.instructions);
  }
  if (recipe.notes !== undefined) {
    updates.push('notes = @notes');
    params.notes = recipe.notes;
  }
  if (recipe.image_url !== undefined) {
    updates.push('image_url = @image_url');
    params.image_url = recipe.image_url;
  }
  if (recipe.source_url !== undefined) {
    updates.push('source_url = @source_url');
    params.source_url = recipe.source_url;
  }
  if (recipe.is_favorite !== undefined) {
    updates.push('is_favorite = @is_favorite');
    params.is_favorite = recipe.is_favorite;
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');

  const stmt = db.prepare(`
    UPDATE recipes SET ${updates.join(', ')} WHERE id = @id
  `);

  const result = stmt.run(params);
  return result.changes > 0;
}

export function deleteRecipe(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM recipes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ===== MEAL INTERFACES =====

export interface Meal {
  id?: number;
  name: string;
  servings?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MealItem {
  id?: number;
  meal_id: number;
  recipe_id?: number;
  item_type: 'recipe' | 'simple';
  simple_item_name?: string;
  simple_item_category?: string;
  order_index: number;
  created_at?: string;
}

export interface MealItemWithRecipe extends MealItem {
  recipe?: Recipe;
}

export interface MealWithItems extends Meal {
  items: MealItemWithRecipe[];
}

// ===== MEAL CRUD OPERATIONS =====

export function insertMeal(meal: Meal): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO meals (name, servings, notes)
    VALUES (@name, @servings, @notes)
  `);

  const result = stmt.run({
    name: meal.name,
    servings: meal.servings || null,
    notes: meal.notes || null,
  });

  return result.lastInsertRowid as number;
}

export function getAllMeals(): Meal[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM meals ORDER BY created_at DESC');
  return stmt.all() as Meal[];
}

export function getMealById(id: number): Meal | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM meals WHERE id = ?');
  return stmt.get(id) as Meal | null;
}

export function updateMeal(id: number, meal: Partial<Meal>): boolean {
  const db = getDb();
  const updates: string[] = [];
  const params: any = { id };

  if (meal.name !== undefined) {
    updates.push('name = @name');
    params.name = meal.name;
  }
  if (meal.servings !== undefined) {
    updates.push('servings = @servings');
    params.servings = meal.servings;
  }
  if (meal.notes !== undefined) {
    updates.push('notes = @notes');
    params.notes = meal.notes;
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');

  const stmt = db.prepare(`
    UPDATE meals SET ${updates.join(', ')} WHERE id = @id
  `);

  const result = stmt.run(params);
  return result.changes > 0;
}

export function deleteMeal(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM meals WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ===== MEAL ITEM OPERATIONS =====

export function insertMealItem(item: MealItem): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO meal_items (
      meal_id, recipe_id, item_type, simple_item_name,
      simple_item_category, order_index
    ) VALUES (
      @meal_id, @recipe_id, @item_type, @simple_item_name,
      @simple_item_category, @order_index
    )
  `);

  const result = stmt.run({
    meal_id: item.meal_id,
    recipe_id: item.recipe_id || null,
    item_type: item.item_type,
    simple_item_name: item.simple_item_name || null,
    simple_item_category: item.simple_item_category || null,
    order_index: item.order_index,
  });

  return result.lastInsertRowid as number;
}

export function getMealItems(mealId: number): MealItemWithRecipe[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      mi.*,
      r.id as recipe_id,
      r.name as recipe_name,
      r.description as recipe_description,
      r.ingredients as recipe_ingredients,
      r.instructions as recipe_instructions,
      r.recipe_category as recipe_category,
      r.recipe_cuisine as recipe_cuisine,
      r.prep_time as recipe_prep_time,
      r.cook_time as recipe_cook_time,
      r.servings as recipe_servings
    FROM meal_items mi
    LEFT JOIN recipes r ON mi.recipe_id = r.id
    WHERE mi.meal_id = ?
    ORDER BY mi.order_index ASC
  `);

  const rows = stmt.all(mealId) as any[];

  return rows.map(row => {
    const item: MealItemWithRecipe = {
      id: row.id,
      meal_id: row.meal_id,
      recipe_id: row.recipe_id,
      item_type: row.item_type,
      simple_item_name: row.simple_item_name,
      simple_item_category: row.simple_item_category,
      order_index: row.order_index,
      created_at: row.created_at,
    };

    // If this is a recipe item, populate the recipe object
    if (row.item_type === 'recipe' && row.recipe_id) {
      item.recipe = {
        id: row.recipe_id,
        name: row.recipe_name,
        description: row.recipe_description,
        ingredients: JSON.parse(row.recipe_ingredients),
        instructions: JSON.parse(row.recipe_instructions),
        recipe_category: row.recipe_category,
        recipe_cuisine: row.recipe_cuisine,
        prep_time: row.recipe_prep_time,
        cook_time: row.recipe_cook_time,
        servings: row.recipe_servings,
      };
    }

    return item;
  });
}

export function getMealWithItems(id: number): MealWithItems | null {
  const meal = getMealById(id);
  if (!meal) return null;

  const items = getMealItems(id);

  return {
    ...meal,
    items,
  };
}

export function deleteMealItem(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM meal_items WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
