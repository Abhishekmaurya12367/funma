/**
 * Unit tests for money utility functions.
 * These test pure functions with no I/O — fast and deterministic.
 */

const { dollarsToCents, centsToDollars, formatCurrency } = require('../utils/money');

describe('dollarsToCents', () => {
  test('converts whole dollar amounts correctly', () => {
    expect(dollarsToCents(10)).toBe(1000);
    expect(dollarsToCents('10')).toBe(1000);
    expect(dollarsToCents(1)).toBe(100);
  });

  test('converts fractional amounts correctly', () => {
    expect(dollarsToCents('0.99')).toBe(99);
    expect(dollarsToCents('12.50')).toBe(1250);
    expect(dollarsToCents('0.01')).toBe(1);
  });

  test('handles the classic 0.1 + 0.2 floating-point trap', () => {
    // 0.1 + 0.2 in JS = 0.30000000000000004
    // Our function should give 30 cents, not 29 or 31
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
  });

  test('throws for zero amount', () => {
    expect(() => dollarsToCents(0)).toThrow('greater than zero');
  });

  test('throws for negative amount', () => {
    expect(() => dollarsToCents(-5)).toThrow('greater than zero');
  });

  test('throws for non-numeric input', () => {
    expect(() => dollarsToCents('abc')).toThrow('not a number');
  });

  test('throws for amount exceeding maximum', () => {
    expect(() => dollarsToCents(2_000_000)).toThrow('maximum');
  });
});

describe('centsToDollars', () => {
  test('converts cents to dollar string with 2 decimal places', () => {
    expect(centsToDollars(1250)).toBe('12.50');
    expect(centsToDollars(99)).toBe('0.99');
    expect(centsToDollars(100)).toBe('1.00');
    expect(centsToDollars(0)).toBe('0.00');
  });

  test('throws for non-integer cents', () => {
    expect(() => centsToDollars(12.5)).toThrow();
  });

  test('throws for negative cents', () => {
    expect(() => centsToDollars(-100)).toThrow();
  });
});

describe('formatCurrency', () => {
  test('formats cents as USD currency string', () => {
    expect(formatCurrency(1250)).toBe('$12.50');
    expect(formatCurrency(100000)).toBe('$1,000.00');
    expect(formatCurrency(1)).toBe('$0.01');
  });
});
