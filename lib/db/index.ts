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
  search?: string;
}): Recipe[] {
  const db = getDb();
  let query = 'SELECT * FROM recipes WHERE 1=1';
  const params: any[] = [];

  if (filters.category) {
    query += ' AND recipe_category = ?';
    params.push(filters.category);
  }

  if (filters.cuisine) {
    query += ' AND recipe_cuisine = ?';
    params.push(filters.cuisine);
  }

  if (filters.search) {
    // Add prefix wildcard for partial matching (e.g., "bulg" matches "bulgur")
    const searchTerm = filters.search.trim() + '*';

    query = `
      SELECT recipes.* FROM recipes
      JOIN recipes_fts ON recipes.id = recipes_fts.rowid
      WHERE recipes_fts MATCH ?
      ${filters.category ? 'AND recipe_category = ?' : ''}
      ${filters.cuisine ? 'AND recipe_cuisine = ?' : ''}
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

export function deleteRecipe(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM recipes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
