---
slugName: strict-image-size-adjust-parser
includeFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
editFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
original_prompt: passe die ImageSizeAdjustParser klasse so an, dass :2;480:1.5;1200:1
  bedeutet 2 für unter ab 480 1.5 bis 1200 dann 1. :2 heisst default gleich 2 genaus
  so wie 2 heisst auch default 2. alle anderen syntaxen entfernen und exception auslösen.
  Scale can be also floats like 1.5 or 0.4. Keep the code short and readable
---
# Prepare: Make ImageSizeAdjustParser accept only strict syntax

Adjust ImageSizeAdjustParser to accept only the strict syntax:
- ":2;480:1.5;1200:1" means:
  - default 2 for widths < 480,
  - 1.5 for widths >= 480 and < 1200,
  - 1 for widths >= 1200.
- ":2" means default = 2.
- "2" means default = 2.
- Scales can be floats (e.g., 1.5, 0.4).
- All other syntaxes must throw an exception.
- Keep the code short and readable.

## Assumptions

- Only these entry forms are valid:
  - Exact single number: "^[0-9]+(?:\\.[0-9]+)?$" → default only.
  - Default entry within a list: "^:([0-9]+(?:\\.[0-9]+)?)$".
  - Min:Scale pair within a list: "^([0-9]+):([0-9]+(?:\\.[0-9]+)?)$".
- Entries are separated by semicolons only (";"). Commas or equals or words like "default" are invalid and must throw.
- Duplicate minScreen entries are allowed; last-wins.
- Negative numbers are invalid.
- Whitespace around entries is allowed and ignored.
- On invalid syntax, parse must throw (not ignore silently).
- Clamping scales is not required; return parsed numeric scale directly.

Example improvements to the original request:
- Please confirm whether "2;480:1.5" should be treated as default=2 followed by range (currently only ":2;480:1.5" is accepted for lists; single "2" is accepted alone).

## Tasks

- parser-implement-strict-syntax Implement strict parser that accepts only ":<scale>" and "<min>:<scale>" with ";" separators, or a single "<scale>".
- tests-update-for-strict-syntax Update tests to the new strict behavior; invalid syntaxes must throw.

## Overview: File changes

- ./src/lib/mediastore/ImageSizeAdjustParser.ts Replace entire file with a concise strict implementation.
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts Replace tests to match new rules and throwing behavior.

## Detail changes

### ./src/lib/mediastore/ImageSizeAdjustParser.ts

Referenced Tasks
- parser-implement-strict-syntax Implement strict-only parsing, throw on invalid, keep API.

Replace entire file with:

```typescript
/**
 * Strict ImageSizeAdjustParser:
 * - Accepts only:
 *   - ":<scale>" for default in lists
 *   - "<min>:<scale>" entries
 *   - ";" as separator
 *   - or a single "<scale>" meaning default
 * - Scales can be floats. No negatives. Invalid syntax -> throw.
 */
export interface SizeRule {
  minScreen: number;
  scale: number;
}
export type ImageSizeAdjustmentRules = SizeRule[];

export class ImageSizeAdjustParser {
  public static parse(input: string | null | undefined): ImageSizeAdjustmentRules {
    if (input == null) return [];
    const text = input.trim();
    if (!text) return [];

    // Single default scale case: "2" or "1.5"
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      return [{ minScreen: 0, scale: parseFloat(text) }];
    }

    const parts = text.split(";").map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("Invalid adjust-sizes input");

    const rules = new Map<number, number>();
    for (const p of parts) {
      let m: RegExpMatchArray | null;

      // Default entry in lists: ":2" or ":1.5"
      if ((m = p.match(/^:([0-9]+(?:\.[0-9]+)?)$/))) {
        rules.set(0, parseFloat(m[1]));
        continue;
      }

      // Range entry: "480:1.5"
      if ((m = p.match(/^([0-9]+):([0-9]+(?:\.[0-9]+)?)$/))) {
        const min = parseInt(m[1], 10);
        const scale = parseFloat(m[2]);
        rules.set(min, scale);
        continue;
      }

      // Anything else is invalid in strict mode
      throw new Error(`Invalid adjust-sizes entry: "${p}"`);
    }

    return Array.from(rules.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([minScreen, scale]) => ({ minScreen, scale }));
  }

  public static fromElement(el: Element | null | undefined, attributeName = "adjust-sizes"): ImageSizeAdjustmentRules {
    if (!el) return [];
    return ImageSizeAdjustParser.parse(el.getAttribute(attributeName));
  }

  public static getScaleForWidth(rules: ImageSizeAdjustmentRules, width: number, defaultScale = 1): number {
    if (!Number.isFinite(width) || width < 0) return defaultScale;
    if (!rules || rules.length === 0) return defaultScale;

    let scale = defaultScale;
    for (const r of rules) {
      if (width >= r.minScreen) scale = r.scale;
      else break;
    }
    return scale;
  }
}
```

### ./src/lib/mediastore/ImageSizeAdjustParser.test.ts

Referenced Tasks
- tests-update-for-strict-syntax Cover new strict parsing and throwing behavior.

Replace entire file with:

```typescript
import { describe, it, expect } from 'vitest';
import { ImageSizeAdjustParser, ImageSizeAdjustmentRules } from './ImageSizeAdjustParser';

describe('ImageSizeAdjustParser.parse (strict)', () => {
  it('parses ":2;480:1.5;1200:1"', () => {
    const rules = ImageSizeAdjustParser.parse(':2;480:1.5;1200:1');
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('parses only default with ":2"', () => {
    expect(ImageSizeAdjustParser.parse(':2')).toEqual([{ minScreen: 0, scale: 2 }]);
  });

  it('parses only default with "2"', () => {
    expect(ImageSizeAdjustParser.parse('2')).toEqual([{ minScreen: 0, scale: 2 }]);
    expect(ImageSizeAdjustParser.parse('1.5')).toEqual([{ minScreen: 0, scale: 1.5 }]);
  });

  it('handles whitespace and empty parts', () => {
    const rules = ImageSizeAdjustParser.parse('  :2  ;  480:1.5 ;  1200:1  ; ');
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('applies last value for duplicate minScreen keys', () => {
    const rules = ImageSizeAdjustParser.parse(':2;480:1.5;480:1.25;1200:1');
    expect(rules).toEqual([
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
      '',
      '   ;   ',
    ];
    for (const s of invalidInputs) {
      expect(() => ImageSizeAdjustParser.parse(s)).toThrowError();
    }
  });

  it('returns [] for null/undefined/blank', () => {
    expect(ImageSizeAdjustParser.parse(null as unknown as string)).toEqual([]);
    expect(ImageSizeAdjustParser.parse(undefined)).toEqual([]);
    expect(ImageSizeAdjustParser.parse('   ')).toEqual([]);
  });
});

describe('ImageSizeAdjustParser.fromElement', () => {
  it('reads attribute and parses', () => {
    const el = document.createElement('div');
    el.setAttribute('adjust-sizes', ':2;480:1.5');
    const rules = ImageSizeAdjustParser.fromElement(el);
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
    ]);
  });

  it('supports custom attribute name', () => {
    const el = document.createElement('div');
    el.setAttribute('data-sizes', ':1.5;1200:1');
    const rules = ImageSizeAdjustParser.fromElement(el, 'data-sizes');
    expect(rules).toEqual([
      { minScreen: 0, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('returns [] for null or missing attribute', () => {
    expect(ImageSizeAdjustParser.fromElement(null)).toEqual([]);
    const el = document.createElement('div');
    expect(ImageSizeAdjustParser.fromElement(el)).toEqual([]);
  });
});

describe('ImageSizeAdjustParser.getScaleForWidth', () => {
  const rules: ImageSizeAdjustmentRules = [
    { minScreen: 0, scale: 2 },
    { minScreen: 480, scale: 1.5 },
    { minScreen: 1200, scale: 1 },
  ];

  it('selects correct scale by width', () => {
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 0)).toBeCloseTo(2);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 479)).toBeCloseTo(2);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 480)).toBeCloseTo(1.5);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 1199)).toBeCloseTo(1.5);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 1200)).toBeCloseTo(1);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 1920)).toBeCloseTo(1);
  });

  it('uses defaultScale when no rules or invalid width', () => {
    expect(ImageSizeAdjustParser.getScaleForWidth([], 800, 1.1)).toBeCloseTo(1.1);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, NaN as unknown as number, 1.2)).toBeCloseTo(1.2);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, -1 as unknown as number, 1.3)).toBeCloseTo(1.3);
  });
});
```

