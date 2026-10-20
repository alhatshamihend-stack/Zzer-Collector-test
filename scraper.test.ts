import { describe, expect, it, vi } from 'vitest';
import { normalizeDegree, parseProductPayload } from '../src/scraper.js';

const luxuryBagPayload = {
  data: {
    detail: {
      id: '1001',
      name: 'Luxury Bag',
      price: '2990',
      degreeDesc: '9.5新',
      imageList: ['bag1.jpg', '/bag2.jpg'],
    },
    brand: { name: 'Zzer' },
  },
};

const jewelryPayload = {
  data: {
    detail: {
      id: '1002',
      name: 'Pearl Ring',
      price: 1200,
      degreeDesc: null,
      imageList: ['ring1.jpg', 'ring2.jpg', 'ring3.jpg'],
    },
    brand: { name: 'Jewelry Co' },
  },
};

const clothingPayload = {
  data: {
    detail: {
      id: '1003',
      name: 'Loose Coat',
      price: 499,
      degreeDesc: '8新',
      imageList: ['coat1.jpg'],
    },
    brand: { name: 'Style House' },
  },
};

describe('normalizeDegree', () => {
  it('maps luxury goods to A', () => {
    expect(normalizeDegree('10新')).toBe('A');
    expect(normalizeDegree('9.9新')).toBe('A');
    expect(normalizeDegree('9.5新')).toBe('A');
  });

  it('maps mid-range goods to B', () => {
    expect(normalizeDegree('9.4新')).toBe('B');
    expect(normalizeDegree('8.5新')).toBe('B');
  });

  it('maps lower grades to C/D', () => {
    expect(normalizeDegree('8.4新')).toBe('C');
    expect(normalizeDegree('7.5新')).toBe('C');
    expect(normalizeDegree('7.4新')).toBe('D');
    expect(normalizeDegree('6新')).toBe('D');
  });

  it('maps empty values to N/A', () => {
    expect(normalizeDegree('')).toBe('N/A');
    expect(normalizeDegree(null)).toBe('N/A');
    expect(normalizeDegree(undefined)).toBe('N/A');
  });
});

describe('parseProductPayload', () => {
  it('handles luxury bag payload', () => {
    const record = parseProductPayload(luxuryBagPayload, '1001', 'https://zzer.com/product/1001');

    expect(record.item_id).toBe('1001');
    expect(record.condition_grade).toBe('A');
    expect(record.images).toEqual([
      'https://img.goshare2.com/bag1.jpg',
      'https://img.goshare2.com/bag2.jpg',
    ]);
  });

  it('handles jewelry payload with null degree', () => {
    const record = parseProductPayload(jewelryPayload, '1002', 'https://zzer.com/product/1002');

    expect(record.condition_grade).toBe('N/A');
    expect(record.images).toHaveLength(3);
  });

  it('handles clothing payload', () => {
    const record = parseProductPayload(clothingPayload, '1003', 'https://zzer.com/product/1003');

    expect(record.condition_grade).toBe('C');
  });

  it('throws for malformed payload', () => {
    expect(() => parseProductPayload({ data: { detail: { name: 'broken' } } }, 'bad', 'https://example.com')).toThrow();
  });
});

vi.stubGlobal('fetch', vi.fn());
