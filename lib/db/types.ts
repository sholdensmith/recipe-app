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
  ingredients: string[];
  instructions: string[];
  notes?: string;
  image_url?: string;
  source_url?: string;
  raw_text?: string;
  created_at?: string;
  updated_at?: string;
}

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
