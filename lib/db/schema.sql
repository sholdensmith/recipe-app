-- Recipes table following Schema.org Recipe standard
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  date_published DATETIME DEFAULT CURRENT_TIMESTAMP,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  total_time INTEGER, -- minutes
  servings TEXT,
  recipe_yield TEXT,
  recipe_category TEXT, -- e.g., "dessert", "main", "appetizer", "side", "veggie"
  recipe_cuisine TEXT, -- e.g., "Italian", "Mexican", "Thai"
  ingredients TEXT NOT NULL, -- JSON array
  instructions TEXT NOT NULL, -- JSON array of steps
  notes TEXT,
  image_url TEXT,
  source_url TEXT,
  raw_text TEXT, -- Original raw recipe text
  is_favorite INTEGER DEFAULT 0, -- 1 if starred/favorited, 0 otherwise
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for common searches
CREATE INDEX IF NOT EXISTS idx_recipe_category ON recipes(recipe_category);
CREATE INDEX IF NOT EXISTS idx_recipe_cuisine ON recipes(recipe_cuisine);
CREATE INDEX IF NOT EXISTS idx_recipe_name ON recipes(name);

-- Full-text search for ingredients and instructions
CREATE VIRTUAL TABLE IF NOT EXISTS recipes_fts USING fts5(
  name,
  ingredients,
  instructions,
  content=recipes,
  content_rowid=id
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS recipes_ai AFTER INSERT ON recipes BEGIN
  INSERT INTO recipes_fts(rowid, name, ingredients, instructions)
  VALUES (new.id, new.name, new.ingredients, new.instructions);
END;

CREATE TRIGGER IF NOT EXISTS recipes_ad AFTER DELETE ON recipes BEGIN
  DELETE FROM recipes_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS recipes_au AFTER UPDATE ON recipes BEGIN
  UPDATE recipes_fts SET
    name = new.name,
    ingredients = new.ingredients,
    instructions = new.instructions
  WHERE rowid = new.id;
END;

-- Meals table: stores saved meal plans
CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  servings TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meal items: links recipes and non-recipe items to meals
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  recipe_id INTEGER,
  item_type TEXT NOT NULL CHECK(item_type IN ('recipe', 'simple')),
  simple_item_name TEXT,
  simple_item_category TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_recipe_id ON meal_items(recipe_id);
