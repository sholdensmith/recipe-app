import { createClient } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  const client = createClient();
  await client.connect();

  try {
    const schema = readFileSync(join(process.cwd(), 'lib', 'db', 'schema.sql.postgres'), 'utf-8');

    console.log('Running migration...\n');

    // Execute the entire schema as one statement
    // PostgreSQL can handle multiple statements separated by semicolons
    await client.query(schema);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
