import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { toFtsQuery } from '../lib/db/sqlite';

describe('toFtsQuery', () => {
  it('adds a prefix wildcard to each word', () => {
    expect(toFtsQuery('chicken')).toBe('"chicken"*');
    expect(toFtsQuery('chicken soup')).toBe('"chicken"* "soup"*');
  });

  it('quotes FTS5 operator characters', () => {
    expect(toFtsQuery('half-and-half')).toBe('"half-and-half"*');
    expect(toFtsQuery('salt (kosher)')).toBe('"salt"* "(kosher)"*');
  });

  it('escapes embedded double quotes', () => {
    expect(toFtsQuery('the "best" pie')).toBe('"the"* """best"""* "pie"*');
  });
});

describe('FTS5 search end-to-end', () => {
  function makeDb() {
    const db = new Database(':memory:');
    const schema = readFileSync(join(__dirname, '..', 'lib', 'db', 'schema.sql'), 'utf-8');
    db.exec(schema);
    db.prepare(
      `INSERT INTO recipes (name, ingredients, instructions) VALUES (?, ?, ?)`
    ).run(
      'Creamy Pasta',
      JSON.stringify(['1 cup half-and-half', '8 oz penne']),
      JSON.stringify(['Boil pasta', 'Stir in half-and-half'])
    );
    return db;
  }

  function search(db: Database.Database, input: string) {
    return db
      .prepare(
        `SELECT recipes.* FROM recipes
         JOIN recipes_fts ON recipes.id = recipes_fts.rowid
         WHERE recipes_fts MATCH ? ORDER BY rank`
      )
      .all(toFtsQuery(input));
  }

  it('finds recipes by ingredient prefix', () => {
    const db = makeDb();
    expect(search(db, 'penn')).toHaveLength(1);
    db.close();
  });

  it('does not throw on hyphenated searches', () => {
    const db = makeDb();
    // Raw "half-and-half*" would be an FTS5 syntax error
    expect(() => search(db, 'half-and-half')).not.toThrow();
    expect(search(db, 'half-and-half')).toHaveLength(1);
    db.close();
  });

  it('does not throw on quotes and parens', () => {
    const db = makeDb();
    expect(() => search(db, '"pasta (creamy)')).not.toThrow();
    db.close();
  });
});
