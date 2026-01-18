import { sql } from '@vercel/postgres';
import type { Recipe, Meal, MealItem, MealItemWithRecipe, MealWithItems } from './types';

// Helper to convert array params to positional ($1, $2, etc)
function toPositional(values: any[]): string {
  return values.map((_, i) => `$${i + 1}`).join(', ');
}

// ===== RECIPE OPERATIONS =====

export async function insertRecipe(recipe: Recipe): Promise<number> {
  const result = await sql`
    INSERT INTO recipes (
      name, description, author, prep_time, cook_time, total_time,
      servings, recipe_yield, recipe_category, recipe_cuisine,
      ingredients, instructions, notes, image_url, source_url, raw_text
    ) VALUES (
      ${recipe.name}, ${recipe.description || null}, ${recipe.author || null},
      ${recipe.prep_time || null}, ${recipe.cook_time || null}, ${recipe.total_time || null},
      ${recipe.servings || null}, ${recipe.recipe_yield || null},
      ${recipe.recipe_category || null}, ${recipe.recipe_cuisine || null},
      ${JSON.stringify(recipe.ingredients)}, ${JSON.stringify(recipe.instructions)},
      ${recipe.notes || null}, ${recipe.image_url || null},
      ${recipe.source_url || null}, ${recipe.raw_text || null}
    ) RETURNING id
  `;
  return result.rows[0].id;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const result = await sql`SELECT * FROM recipes ORDER BY created_at DESC`;
  return result.rows as Recipe[];
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
  const result = await sql`SELECT * FROM recipes WHERE id = ${id}`;
  if (result.rows.length === 0) return null;
  return result.rows[0] as Recipe;
}

export async function filterRecipes(filters: {
  category?: string;
  cuisine?: string;
  search?: string;
}): Promise<Recipe[]> {
  let query = 'SELECT * FROM recipes WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.category) {
    query += ` AND recipe_category = $${paramIndex++}`;
    params.push(filters.category);
  }

  if (filters.cuisine) {
    query += ` AND recipe_cuisine = $${paramIndex++}`;
    params.push(filters.cuisine);
  }

  if (filters.search) {
    query += ` AND (
      name ILIKE $${paramIndex} OR
      ingredients::text ILIKE $${paramIndex} OR
      instructions::text ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  const result = await sql.query(query, params);
  return result.rows as Recipe[];
}

export async function getCategories(): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT recipe_category
    FROM recipes
    WHERE recipe_category IS NOT NULL
    ORDER BY recipe_category
  `;
  return result.rows.map(row => row.recipe_category);
}

export async function getCuisines(): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT recipe_cuisine
    FROM recipes
    WHERE recipe_cuisine IS NOT NULL
    ORDER BY recipe_cuisine
  `;
  return result.rows.map(row => row.recipe_cuisine);
}

export async function deleteRecipe(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM recipes WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}

// ===== MEAL OPERATIONS =====

export async function insertMeal(meal: Meal): Promise<number> {
  const result = await sql`
    INSERT INTO meals (name, servings, notes)
    VALUES (${meal.name}, ${meal.servings || null}, ${meal.notes || null})
    RETURNING id
  `;
  return result.rows[0].id;
}

export async function getAllMeals(): Promise<Meal[]> {
  const result = await sql`SELECT * FROM meals ORDER BY created_at DESC`;
  return result.rows as Meal[];
}

export async function getMealById(id: number): Promise<Meal | null> {
  const result = await sql`SELECT * FROM meals WHERE id = ${id}`;
  return result.rows[0] as Meal || null;
}

export async function updateMeal(id: number, meal: Partial<Meal>): Promise<boolean> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (meal.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(meal.name);
  }
  if (meal.servings !== undefined) {
    updates.push(`servings = $${paramIndex++}`);
    params.push(meal.servings);
  }
  if (meal.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    params.push(meal.notes);
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const query = `UPDATE meals SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
  const result = await sql.query(query, params);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteMeal(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM meals WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}

// ===== MEAL ITEM OPERATIONS =====

export async function insertMealItem(item: MealItem): Promise<number> {
  const result = await sql`
    INSERT INTO meal_items (
      meal_id, recipe_id, item_type, simple_item_name,
      simple_item_category, order_index
    ) VALUES (
      ${item.meal_id}, ${item.recipe_id || null}, ${item.item_type},
      ${item.simple_item_name || null}, ${item.simple_item_category || null},
      ${item.order_index}
    ) RETURNING id
  `;
  return result.rows[0].id;
}

export async function getMealItems(mealId: number): Promise<MealItemWithRecipe[]> {
  const result = await sql`
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
    WHERE mi.meal_id = ${mealId}
    ORDER BY mi.order_index ASC
  `;

  return result.rows.map(row => {
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

    if (row.item_type === 'recipe' && row.recipe_id) {
      item.recipe = {
        id: row.recipe_id,
        name: row.recipe_name,
        description: row.recipe_description,
        ingredients: row.recipe_ingredients,
        instructions: row.recipe_instructions,
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

export async function getMealWithItems(id: number): Promise<MealWithItems | null> {
  const meal = await getMealById(id);
  if (!meal) return null;

  const items = await getMealItems(id);

  return {
    ...meal,
    items,
  };
}

export async function deleteMealItem(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM meal_items WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}
