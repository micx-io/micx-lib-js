import { describe, it, expect } from 'vitest';
import { ImageSizeAdjustParser, ImageSizeAdjustmentRules } from './ImageSizeAdjustParser';

describe('ImageSizeAdjustParser (strict, instance API)', () => {
  it('parses ":2;480:1.5;1200:1"', () => {
    const p = new ImageSizeAdjustParser(':2;480:1.5;1200:1');
    expect(p.rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('parses only default with ":2" and "2"', () => {
    expect(new ImageSizeAdjustParser(':2').rules).toEqual([{ minScreen: 0, scale: 2 }]);
    expect(new ImageSizeAdjustParser('2').rules).toEqual([{ minScreen: 0, scale: 2 }]);
    expect(new ImageSizeAdjustParser('1.5').rules).toEqual([{ minScreen: 0, scale: 1.5 }]);
  });

  it('handles whitespace and empty parts', () => {
    const p = new ImageSizeAdjustParser('  :2  ;  480:1.5 ;  1200:1  ; ');
    expect(p.rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('applies last value for duplicate minScreen keys', () => {
    const p = new ImageSizeAdjustParser(':2;480:1.5;480:1.25;1200:1');
    expect(p.rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.25 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('throws on invalid syntaxes', () => {
    const invalidInputs = [
      'default:1.2',
      '600=2,900=1.5',
      '600=2',
      '600,900:1.5',
      'foo',
      '-1:1.2',
      '600:-1',
      ':',
      '600:',
      ':x',
      '600:x',
      '600:1.2;900=1.5',
      '   ;   ',
    ];
    for (const s of invalidInputs) {
      expect(() => new ImageSizeAdjustParser(s)).toThrowError();
    }
  });

  it('returns [] for null/undefined/blank', () => {
    expect(new ImageSizeAdjustParser(null as unknown as string).rules).toEqual([]);
    expect(new ImageSizeAdjustParser(undefined).rules).toEqual([]);
    expect(new ImageSizeAdjustParser('   ').rules).toEqual([]);
  });
});

describe('ImageSizeAdjustParser.getSizeAdjustment', () => {
  const rules: ImageSizeAdjustmentRules = [
    { minScreen: 0, scale: 2 },
    { minScreen: 480, scale: 1.5 },
    { minScreen: 1200, scale: 1 },
  ];

  it('selects correct scale by width', () => {
    const p = new ImageSizeAdjustParser(':2;480:1.5;1200:1');
    expect(p.getSizeAdjustment(0)).toBeCloseTo(2);
    expect(p.getSizeAdjustment(479)).toBeCloseTo(2);
    expect(p.getSizeAdjustment(480)).toBeCloseTo(1.5);
    expect(p.getSizeAdjustment(1199)).toBeCloseTo(1.5);
    expect(p.getSizeAdjustment(1200)).toBeCloseTo(1);
    expect(p.getSizeAdjustment(1920)).toBeCloseTo(1);
  });


});