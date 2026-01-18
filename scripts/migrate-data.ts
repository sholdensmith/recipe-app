import { createClient } from '@vercel/postgres';
import * as sqlite from '../lib/db/sqlite';

async function migrateData() {
  console.log('Starting data migration from SQLite to Postgres...\n');

  const client = createClient();
  await client.connect();

  try {
    // Get all recipes from SQLite
    console.log('Reading recipes from local SQLite database...');
    const recipes = sqlite.getAllRecipes();
    console.log(`Found ${recipes.length} recipes to migrate\n`);

    if (recipes.length === 0) {
      console.log('No recipes to migrate.');
      return;
    }

    // Insert each recipe into Postgres
    let successCount = 0;
    let errorCount = 0;

    for (const recipe of recipes) {
      try {
        const result = await client.query(`
          INSERT INTO recipes (
            name, description, author, prep_time, cook_time, total_time,
            servings, recipe_yield, recipe_category, recipe_cuisine,
            ingredients, instructions, notes, image_url, source_url, raw_text
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          ) RETURNING id
        `, [
          recipe.name,
          recipe.description || null,
          recipe.author || null,
          recipe.prep_time || null,
          recipe.cook_time || null,
          recipe.total_time || null,
          recipe.servings || null,
          recipe.recipe_yield || null,
          recipe.recipe_category || null,
          recipe.recipe_cuisine || null,
          JSON.stringify(recipe.ingredients),
          JSON.stringify(recipe.instructions),
          recipe.notes || null,
          recipe.image_url || null,
          recipe.source_url || null,
          recipe.raw_text || null,
        ]);

        const newId = result.rows[0].id;
        console.log(`✓ Migrated: "${recipe.name}" (SQLite ID: ${recipe.id} → Postgres ID: ${newId})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to migrate "${recipe.name}":`, error instanceof Error ? error.message : error);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateData();
