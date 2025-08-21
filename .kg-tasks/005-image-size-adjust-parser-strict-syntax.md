---
slugName: image-size-adjust-parser-strict-syntax
includeFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
editFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
original_prompt: passe die ImageSizeAdjustParser klasse so an, dass :2;480:1.5;1200:1
  bedeutet 2 für unter ab 480 1.5 bis 1200 dann 1. :2 heisst default gleich 2 genaus
  so wie 2 heisst auch default 2. alle anderen syntaxen entfernen und exception auslösen.
---
# Prepare Adjust ImageSizeAdjustParser to strict syntax

Implement a strict parser for image size adjustments:
- Only allow rules separated by semicolons.
- Each rule must be either:
  - ":<scale>" meaning default (minScreen 0) scale,
  - "<min>:<scale>" for a breakpoint rule, or
  - "<scale>" as default-only rule (same meaning as ":<scale>").
- Any other syntax must throw an exception.
- Example: ":2;480:1.5;1200:1" means scale 2 below 480, 1.5 from 480 up to 1199, and 1 from 1200 and above.
- "2" and ":2" both mean default 2.
- Keep scale clamping to [0.05, 10]. Duplicated minScreen rules: last one wins.

## Assumptions

- Scales are positive numbers; negative or zero scales are invalid and will cause either clamp to 0.05 (as before) once parsed; however invalid syntax (e.g., signs in min or scale) will throw.
- minScreen is a non-negative integer (e.g., 0, 480, 1200).
- Empty or non-string inputs still yield an empty rules array ([]), not an exception.
- A default segment may be provided as ":<scale>" or "<scale>" and can appear anywhere in the list; the last default provided will win.
- We keep clampScale(s) as-is: range [0.05, 10].

If you prefer that defaults only be allowed as the first segment, or that negative scales should throw instead of clamping, please confirm and we’ll adjust.

## Tasks

- Update parser to strict format Throw on any unsupported syntax. Keep clamping; sort rules ascending; last wins for duplicates.
- Update unit tests Replace previous flexible tests with strict tests reflecting the new rules and error behavior.

## Overview: File changes

- src/lib/mediastore/ImageSizeAdjustParser.ts Implement strict parsing (:<scale>, <min>:<scale>, <scale>), throw on others.
- src/lib/mediastore/ImageSizeAdjustParser.test.ts Rewrite tests to match strict rules; add error cases.

## Detail changes

### src/lib/mediastore/ImageSizeAdjustParser.ts

Referenced Tasks
- Update parser to strict format Implement strict parsing; throw on invalid tokens; keep clamping; sorting; defaults.

Replace

```typescript
...original content...
```

by

```typescript
/**
 * Strict parser for "adjust-sizes" strings to scale image sizes based on viewport width.
 *
 * Allowed syntax only:
 *   - ":<scale>"            -> default scale (minScreen = 0)
 *   - "<min>:<scale>"       -> breakpoint rule (minScreen is non-negative integer)
 *   - "<scale>"             -> default-only rule (same as ":<scale>")
 *
 * Examples:
 *   ":2;480:1.5;1200:1"  => default=2, >=480 => 1.5, >=1200 => 1
 *   "2"                  => default=2
 *   "2;480:1.5"          => default=2, >=480 => 1.5
 *
 * Any other syntax MUST throw an Error.
 */

export interface SizeRule {
  minScreen: number; // minimum screen width (inclusive)
  scale: number;     // multiplicative factor
}

export type ImageSizeAdjustmentRules = SizeRule[];

export class ImageSizeAdjustParser {
  /**
   * Parse size adjustment rules from a string.
   *
   * @param input Input string (e.g., ":2;480:1.5;1200:1" or "2")
   * @returns Sorted array of rules (ascending by minScreen)
   * @throws Error if any segment does not match the allowed strict syntax.
   */
  public static parse(input: string | null | undefined): ImageSizeAdjustmentRules {
    if (typeof input !== 'string') return [];
    const text = input.trim();
    if (!text) return [];

    const segments = text.split(';').map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) return [];

    const rulesMap = new Map<number, number>();

    for (const seg of segments) {
      // :<scale> -> default
      if (/^:[0-9]+(?:\.[0-9]+)?$/.test(seg)) {
        const scale = parseFloatSafe(seg.slice(1));
        if (!Number.isFinite(scale)) throw new Error(`Invalid scale in segment "${seg}"`);
        rulesMap.set(0, clampScale(scale));
        continue;
      }

      // <min>:<scale>
      if (/^[0-9]+:[0-9]+(?:\.[0-9]+)?$/.test(seg)) {
        const [minStr, scaleStr] = seg.split(':');
        const min = parseIntSafe(minStr);
        const scale = parseFloatSafe(scaleStr);
        if (!Number.isFinite(min) || min < 0) throw new Error(`Invalid min in segment "${seg}"`);
        if (!Number.isFinite(scale)) throw new Error(`Invalid scale in segment "${seg}"`);
        rulesMap.set(min, clampScale(scale));
        continue;
      }

      // <scale> (default)
      if (/^[0-9]+(?:\.[0-9]+)?$/.test(seg)) {
        const scale = parseFloatSafe(seg);
        if (!Number.isFinite(scale)) throw new Error(`Invalid scale in segment "${seg}"`);
        rulesMap.set(0, clampScale(scale));
        continue;
      }

      // Anything else is not allowed.
      throw new Error(`Invalid size-adjust syntax segment: "${seg}"`);
    }

    const rules: SizeRule[] = Array.from(rulesMap.entries())
      .map(([minScreen, scale]) => ({ minScreen, scale }))
      .sort((a, b) => a.minScreen - b.minScreen);

    return rules;
  }

  /**
   * Reads and parses the given attribute from an element.
   *
   * @param el Element to read from
   * @param attributeName Defaults to "adjust-sizes"
   * @returns Parsed rules (may throw if string contains invalid syntax)
   */
  public static fromElement(el: Element | null | undefined, attributeName: string = 'adjust-sizes'): ImageSizeAdjustmentRules {
    if (!el) return [];
    const value = el.getAttribute(attributeName);
    return ImageSizeAdjustParser.parse(value);
  }

  /**
   * Returns the scale factor for a given viewport width.
   * Picks the rule with the largest minScreen <= width.
   *
   * @param rules Parsed rules
   * @param width Viewport width
   * @param defaultScale Default if no rules match (default 1)
   */
  public static getScaleForWidth(rules: ImageSizeAdjustmentRules, width: number, defaultScale: number = 1): number {
    if (!rules || rules.length === 0) return clampScale(defaultScale);
    if (!isFinite(width) || width < 0) return clampScale(defaultScale);

    let chosen = defaultScale;
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (width >= r.minScreen) {
        chosen = r.scale;
      } else {
        break;
      }
    }
    return clampScale(chosen);
  }
}

function parseIntSafe(v: string): number {
  const n = parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : NaN;
}

function parseFloatSafe(v: string): number {
  const n = parseFloat(v.trim());
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Clamp scale to a safe range.
 */
function clampScale(s: number): number {
  if (!Number.isFinite(s)) return 1;
  if (s < 0.05) return 0.05;
  if (s > 10) return 10;
  return s;
}
```

### src/lib/mediastore/ImageSizeAdjustParser.test.ts

Referenced Tasks
- Update unit tests Replace flexible syntax tests with strict syntax tests and error cases.

Replace

```typescript
...original content...
```

by

```typescript
import { describe, it, expect } from 'vitest';
import { ImageSizeAdjustParser, ImageSizeAdjustmentRules } from './ImageSizeAdjustParser';

describe('ImageSizeAdjustParser.parse (strict)', () => {
  it('parses default + breakpoints with colon syntax', () => {
    const rules = ImageSizeAdjustParser.parse(':2;480:1.5;1200:1');
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('parses default-only value as ":<scale>"', () => {
    const rules = ImageSizeAdjustParser.parse(':2');
    expect(rules).toEqual([{ minScreen: 0, scale: 2 }]);
  });

  it('parses default-only value as "<scale>"', () => {
    const rules = ImageSizeAdjustParser.parse('2');
    expect(rules).toEqual([{ minScreen: 0, scale: 2 }]);
  });

  it('allows numeric default without colon alongside breakpoints', () => {
    const rules = ImageSizeAdjustParser.parse('2;480:1.5;1200:1');
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('applies last value for duplicate minScreen and default segments', () => {
    const rules = ImageSizeAdjustParser.parse(':2;0:1.8;480:2;480:1.5;:1.3;1200:1');
    expect(rules).toEqual([
      { minScreen: 0, scale: 1.3 },   // last default wins
      { minScreen: 480, scale: 1.5 }, // last 480 wins
      { minScreen: 1200, scale: 1 },  // 1200
    ]);
  });

  it('clamps scales to [0.05, 10]', () => {
    const rules = ImageSizeAdjustParser.parse(':0;600:100;900:0.01;1200:9.99');
    expect(rules).toEqual([
      { minScreen: 0, scale: 0.05 },
      { minScreen: 600, scale: 10 },
      { minScreen: 900, scale: 0.05 },
      { minScreen: 1200, scale: 9.99 },
    ]);
  });

  it('handles whitespace', () => {
    const rules = ImageSizeAdjustParser.parse('  :2  ;  480:1.5 ;  1200:1  ');
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
      { minScreen: 1200, scale: 1 },
    ]);
  });

  it('returns empty for non-string or empty input', () => {
    expect(ImageSizeAdjustParser.parse(undefined)).toEqual([]);
    expect(ImageSizeAdjustParser.parse(null)).toEqual([]);
    expect(ImageSizeAdjustParser.parse('')).toEqual([]);
    expect(ImageSizeAdjustParser.parse('   ')).toEqual([]);
  });

  it('throws for any unsupported syntax', () => {
    const invalidInputs = [
      '600=2,900:1.5',
      'default:1.2;480:1.5',
      'foo',
      ':abc',
      '600:abc',
      '-100:2',
      '600:-1',
      '600:1.2,900:1.0',
      '600:1.2;900=1.0',
    ];
    for (const input of invalidInputs) {
      expect(() => ImageSizeAdjustParser.parse(input)).toThrowError(/Invalid/);
    }
  });
});

describe('ImageSizeAdjustParser.fromElement (strict)', () => {
  it('reads and parses attribute', () => {
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
    el.setAttribute('data-sizes', '2;480:1.5');
    const rules = ImageSizeAdjustParser.fromElement(el, 'data-sizes');
    expect(rules).toEqual([
      { minScreen: 0, scale: 2 },
      { minScreen: 480, scale: 1.5 },
    ]);
  });

  it('returns empty array if element null or attribute missing', () => {
    expect(ImageSizeAdjustParser.fromElement(null)).toEqual([]);
    const el = document.createElement('div');
    expect(ImageSizeAdjustParser.fromElement(el)).toEqual([]);
  });
});

describe('ImageSizeAdjustParser.getScaleForWidth (strict)', () => {
  const rules: ImageSizeAdjustmentRules = [
    { minScreen: 0, scale: 2 },
    { minScreen: 480, scale: 1.5 },
    { minScreen: 1200, scale: 1 },
  ];

  it('picks largest minScreen <= width', () => {
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 0)).toBeCloseTo(2);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 479)).toBeCloseTo(2);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 480)).toBeCloseTo(1.5);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 1199)).toBeCloseTo(1.5);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 1200)).toBeCloseTo(1);
    expect(ImageSizeAdjustParser.getScaleForWidth(rules, 2000)).toBeCloseTo(1);
  });

  it('returns default scale if no rules match', () => {
    const onlyHigh: ImageSizeAdjustmentRules = [{ minScreen: 2000, scale: 1.1 }];
    expect(ImageSizeAdjustParser.getScaleForWidth(onlyHigh, 1000)).toBe(1);
    expect(ImageSizeAdjustParser.getScaleForWidth(onlyHigh, 1000, 1.3)).toBeCloseTo(1.3);
  });

  it('clamps default scale if used', () => {
    const empty: ImageSizeAdjustmentRules = [];
    expect(ImageSizeAdjustParser.getScaleForWidth(empty, 800, 0)).toBe(0.05);
    expect(ImageSizeAdjustParser.getScaleForWidth(empty, 800, 100)).toBe(10);
  });

  it('works with rules parsed unsorted (parse sorts ascending)', () => {
    const parsed = ImageSizeAdjustParser.parse('1200:1;:2;480:1.5');
    expect(ImageSizeAdjustParser.getScaleForWidth(parsed, 850)).toBeCloseTo(1.5);
  });
});
```

## Example prompts to clarify requirements

- Sollen negative Skalenwerte eine Exception auslösen (statt Clamping), oder weiterhin auf 0.05 geklammert werden?
- Darf der Default-Wert als einzelner Wert "2" auch zusammen mit Breakpoints verwendet werden ("2;480:1.5"), oder nur alleine?
- Sollen doppelte Breakpoints (z. B. "480:1.2;480:1.5") eine Exception auslösen, oder soll die letzte Definition gewinnen (aktuell: letzte gewinnt)?