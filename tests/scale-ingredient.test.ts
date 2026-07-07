import { describe, it, expect } from 'vitest';
import { parseQuantity, formatQuantity, scaleIngredient } from '../lib/scale-ingredient';

describe('parseQuantity', () => {
  it('parses whole numbers', () => {
    expect(parseQuantity('2')).toBe(2);
  });

  it('parses decimals', () => {
    expect(parseQuantity('1.5')).toBe(1.5);
  });

  it('parses simple fractions', () => {
    expect(parseQuantity('1/2')).toBe(0.5);
    expect(parseQuantity('3/4')).toBe(0.75);
  });

  it('parses mixed numbers', () => {
    expect(parseQuantity('2 1/4')).toBe(2.25);
  });

  it('parses unicode fractions', () => {
    expect(parseQuantity('½')).toBe(0.5);
    expect(parseQuantity('1½')).toBe(1.5);
    expect(parseQuantity('1 ½')).toBe(1.5);
  });

  it('rejects garbage', () => {
    expect(parseQuantity('a pinch')).toBeNull();
    expect(parseQuantity('1/0')).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('formats whole numbers plainly', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(2.01)).toBe('2');
  });

  it('formats common fractions', () => {
    expect(formatQuantity(0.5)).toBe('1/2');
    expect(formatQuantity(0.25)).toBe('1/4');
    expect(formatQuantity(1.5)).toBe('1 1/2');
    expect(formatQuantity(2.25)).toBe('2 1/4');
  });

  it('formats thirds', () => {
    expect(formatQuantity(1 / 3)).toBe('1/3');
    expect(formatQuantity(2 / 3)).toBe('2/3');
  });

  it('snaps near-misses to the closest kitchen fraction', () => {
    expect(formatQuantity(1.15)).toBe('1 1/6');
  });

  it('falls back to decimals when no fraction is close', () => {
    expect(formatQuantity(1.45)).toBe('1.45');
  });
});

describe('scaleIngredient', () => {
  it('returns the line untouched at 1x', () => {
    expect(scaleIngredient('2 cups flour', 1)).toBe('2 cups flour');
  });

  it('doubles whole quantities', () => {
    expect(scaleIngredient('2 cups flour', 2)).toBe('4 cups flour');
  });

  it('halves to fractions', () => {
    expect(scaleIngredient('1 cup sugar', 0.5)).toBe('1/2 cup sugar');
  });

  it('scales mixed numbers', () => {
    expect(scaleIngredient('2 1/4 cups all-purpose flour', 2)).toBe('4 1/2 cups all-purpose flour');
  });

  it('scales unicode fractions', () => {
    expect(scaleIngredient('½ tsp salt', 2)).toBe('1 tsp salt');
  });

  it('scales ranges', () => {
    expect(scaleIngredient('2-3 cloves garlic', 2)).toBe('4-6 cloves garlic');
    expect(scaleIngredient('2 to 3 cloves garlic', 2)).toBe('4 to 6 cloves garlic');
  });

  it('leaves quantity-less lines alone', () => {
    expect(scaleIngredient('salt to taste', 2)).toBe('salt to taste');
    expect(scaleIngredient('a pinch of nutmeg', 3)).toBe('a pinch of nutmeg');
  });

  it('only scales the leading quantity', () => {
    expect(scaleIngredient('1 can (14 oz) crushed tomatoes', 2)).toBe('2 can (14 oz) crushed tomatoes');
  });
});
