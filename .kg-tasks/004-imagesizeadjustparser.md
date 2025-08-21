---
slugName: imagesizeadjustparser
includeFiles:
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
- ./src/lib/mediastore/MicxCdnImgElement.ts
- ./src/lib/mediastore/MicxImageUrlDecoderV2.ts
- ./src/lib/mediastore/MicxImageUrlDecoderV2.test.ts
- ./src/lib/mediastore/MicxImageUrlEncoderV2.ts
- ./package.json
- ./tsconfig.json
- ./vite.config.ts
- ./web-types.json
editFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
original_prompt: entwickle eine klasse ImageSizeAdustParser, dieser bekommt Daten
  in der Form 400:2;1200:1 d.h. bis 400 px screen breite wird 2 zurück gegeben bis
  1200:1 alles darüber wird per default mit 1 zurück gegeben. Wenn ein leerer string
  übergeben wird immer eins. Ein Semikolon ohne wert dahinter auch als ein definieren.
  Damit können die Bilder abhängig von der Größe des bildschirms in einer höheren
  auflösung geladen werden. Nur die Klasse änderung an anderen dateien. Im Fehlerfall
  soll eine exception geworfen werden.:4 bedeutet kleiner als alles andere 4.
---
# Prepare ImageSizeAdjustParser

Implement a robust parser and resolver for a compact “screen-width to scale-factor” configuration string like "400:2;1200:1". The class returns an appropriate factor for a given screen width, supporting a special lower-than-min rule and sensible defaults.

## Assumptions

- The class name will be ImageSizeAdjustParser (fixing the likely typo “Adust”).
- Rule semantics:
  - Rules are separated by semicolons: "<maxWidth>:<factor>;...".
  - Each rule defines an inclusive upper bound (“bis”) for screen width. Example: "400:2" applies for widths <= 400.
  - Rules are evaluated in ascending order of maxWidth. The first matching rule returns its factor.
  - If no rule matches (width > all defined maxWidth values), return the default factor 1.
  - Empty string config means always 1.
  - A segment with empty left part, like ":4", defines a special “smaller than any other threshold” fallback: if width < smallest defined maxWidth, return 4.
  - A trailing semicolon without value (e.g., "400:2;1200:1;") should not cause an error and is effectively ignored. Default “above all” remains 1.
- Validation:
  - maxWidth must be a non-negative integer.
  - factor must be a positive number (float allowed).
  - Invalid formats throw an Error with descriptive messages.
- No other existing files should be changed; adding tests is acceptable.

Example prompts to improve original request:
- “Sollen maxWidth Grenzwerte inklusiv (<=) oder exklusiv (<) sein? Wir nehmen inklusiv an.”
- “Dürfen Faktoren Dezimalzahlen (z. B. 1.5) sein? Wir erlauben Dezimalzahlen > 0.”
- “Sollen doppelte maxWidth-Einträge erlaubt sein? Wir nehmen an: letzte Definition gewinnt.”

## Tasks

- **implement-parser** Add ImageSizeAdjustParser with parsing, validation, and factorFor(width) lookup
- **add-unit-tests** Add comprehensive Vitest tests for normal, edge, and error cases

## Overview: File changes

- ./src/lib/mediastore/ImageSizeAdjustParser.ts Add new parser class with full documentation and strict validation
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts Add unit tests covering typical and edge cases

## Detail changes

### ./src/lib/mediastore/ImageSizeAdjustParser.ts

Referenced Tasks
- implement-parser Provide a robust, validated parser and resolver

Replace

```typescript
...original content...
```

by

```typescript
/**
 * ImageSizeAdjustParser
 *
 * Parses a compact configuration string that maps screen width upper-bounds to scale factors.
 *
 * Syntax:
 *   "<maxWidth>:<factor>[;<maxWidth>:<factor> ...]"
 *
 * Examples:
 * - "400:2;1200:1"  => width <= 400 -> 2, width <= 1200 -> 1, above 1200 -> 1 (default)
 * - ""              => always 1 (default)
 * - ":4;400:2;1200:1" => width < 400 -> 4 (lower-than-min fallback),  <=400 -> 2, <=1200 -> 1, above -> 1
 * - "400:2;1200:1;" => trailing semicolon is ignored, behavior unchanged
 *
 * Notes:
 * - maxWidth is an inclusive upper bound (<=).
 * - If multiple rules define the same maxWidth, the last one wins.
 * - factor must be > 0 (floats allowed).
 * - maxWidth must be an integer >= 0.
 * - Invalid strings throw an Error with a descriptive message.
 */
export class ImageSizeAdjustParser {
  private readonly original: string;
  private readonly rules: Array<{ maxWidth: number; factor: number }>;
  private readonly lowFallbackFactor: number | null;

  /**
   * Create a parser instance from a configuration string.
   * @param config Configuration string, e.g. "400:2;1200:1". Empty string allowed.
   * @throws Error If the config string contains invalid segments or values.
   */
  constructor(config: string | null | undefined) {
    this.original = (config ?? '').trim();
    this.rules = [];
    this.lowFallbackFactor = null;

    if (this.original.length === 0) {
      // Empty config => always 1
      return;
    }

    // Split by semicolons and ignore empty segments (including trailing ;)
    const rawSegments = this.original.split(';').map(s => s.trim()).filter(s => s.length > 0);

    let lowFallback: number | null = null;
    // to allow "last one wins" by width, keep a map then sort
    const byWidth = new Map<number, number>();

    for (const seg of rawSegments) {
      const parts = seg.split(':');

      if (parts.length !== 2) {
        throw new Error(`ImageSizeAdjustParser: Invalid segment "${seg}" (expected "<maxWidth>:<factor>" or ":<factor>")`);
      }

      const [left, right] = parts;

      if (right === undefined || right.trim().length === 0) {
        throw new Error(`ImageSizeAdjustParser: Missing factor in segment "${seg}"`);
      }

      // parse factor (float > 0)
      const factor = Number(right);
      if (!Number.isFinite(factor) || factor <= 0) {
        throw new Error(`ImageSizeAdjustParser: Invalid factor "${right}" in segment "${seg}" (must be a number > 0)`);
      }

      if (left.trim().length === 0) {
        // format ":<factor>" => lower-than-min fallback
        lowFallback = factor;
        continue;
      }

      // parse maxWidth (integer >= 0)
      if (!/^\d+$/.test(left)) {
        throw new Error(`ImageSizeAdjustParser: Invalid maxWidth "${left}" in segment "${seg}" (must be a non-negative integer)`);
      }
      const maxWidth = parseInt(left, 10);
      if (!Number.isFinite(maxWidth) || maxWidth < 0) {
        throw new Error(`ImageSizeAdjustParser: Invalid maxWidth "${left}" in segment "${seg}" (must be >= 0)`);
      }

      byWidth.set(maxWidth, factor); // last one wins semantics
    }

    // Sort rules ascending by maxWidth
    const sorted = Array.from(byWidth.entries()).sort((a, b) => a[0] - b[0]);
    this.rules.push(...sorted.map(([maxWidth, factor]) => ({ maxWidth, factor })));
    (this as any).lowFallbackFactor = lowFallback;
  }

  /**
   * Resolve the factor for a given screen width.
   * - Inclusive upper bounds (<= maxWidth)
   * - If width is less than the smallest defined maxWidth and a low-fallback (":X") is set, return that.
   * - If width exceeds all bounds, return 1.
   *
   * @param width Screen width in pixels.
   * @returns The scale factor (number > 0)
   * @throws Error If width is invalid.
   */
  public factorFor(width: number): number {
    if (!Number.isFinite(width) || width < 0) {
      throw new Error(`ImageSizeAdjustParser: Invalid screen width "${width}" (must be a number >= 0)`);
    }

    if (this.rules.length === 0) {
      return 1; // empty config => always 1
    }

    const minMax = this.rules[0].maxWidth;
    if (this.lowFallbackFactor != null && width < minMax) {
      return this.lowFallbackFactor;
    }

    for (const r of this.rules) {
      if (width <= r.maxWidth) {
        return r.factor;
      }
    }

    return 1; // default above largest maxWidth
  }

  /**
   * Helper to construct and immediately resolve a factor.
   * @param config Config string.
   * @param width Screen width.
   * @returns The resolved factor.
   */
  public static resolve(config: string | null | undefined, width: number): number {
    return new ImageSizeAdjustParser(config).factorFor(width);
  }

  /**
   * Expose rules for inspection (immutable).
   */
  public getRules(): ReadonlyArray<{ maxWidth: number; factor: number }> {
    return this.rules.slice();
  }

  /**
   * Expose the lower-than-min fallback factor if set, else null.
   */
  public getLowFallbackFactor(): number | null {
    return this.lowFallbackFactor;
  }

  /**
   * Return the original string passed into the constructor (trimmed).
   */
  public getOriginal(): string {
    return this.original;
  }
}
```

### ./src/lib/mediastore/ImageSizeAdjustParser.test.ts

Referenced Tasks
- add-unit-tests Cover normal usage, edge cases, and errors

Add the following file:

```typescript
import { describe, it, expect } from 'vitest';
import { ImageSizeAdjustParser } from './ImageSizeAdjustParser';

describe('ImageSizeAdjustParser', () => {
  it('returns 1 for empty string (always 1)', () => {
    const p = new ImageSizeAdjustParser('');
    expect(p.factorFor(0)).toBe(1);
    expect(p.factorFor(320)).toBe(1);
    expect(p.factorFor(5000)).toBe(1);
  });

  it('parses basic rules and applies inclusive upper bounds', () => {
    const p = new ImageSizeAdjustParser('400:2;1200:1');
    expect(p.factorFor(0)).toBe(2);       // <=400
    expect(p.factorFor(320)).toBe(2);     // <=400
    expect(p.factorFor(400)).toBe(2);     // inclusive
    expect(p.factorFor(401)).toBe(1);     // <=1200
    expect(p.factorFor(1200)).toBe(1);    // inclusive
    expect(p.factorFor(1300)).toBe(1);    // above all -> default 1
  });

  it('ignores trailing semicolons', () => {
    const p = new ImageSizeAdjustParser('400:2;1200:1;');
    expect(p.factorFor(1300)).toBe(1);
  });

  it('supports low-than-min fallback with ":factor"', () => {
    const p = new ImageSizeAdjustParser(':4;400:2;1200:1');
    expect(p.factorFor(0)).toBe(4);       // less than smallest (400)
    expect(p.factorFor(399)).toBe(4);     // still less than smallest bound
    expect(p.factorFor(400)).toBe(2);     // at smallest bound
    expect(p.factorFor(800)).toBe(1);     // next rule
    expect(p.factorFor(5000)).toBe(1);    // default
  });

  it('accepts float factors', () => {
    const p = new ImageSizeAdjustParser('400:2.5;1200:1.25');
    expect(p.factorFor(320)).toBeCloseTo(2.5);
    expect(p.factorFor(800)).toBeCloseTo(1.25);
    expect(p.factorFor(2000)).toBe(1);
  });

  it('last rule for same width wins', () => {
    const p = new ImageSizeAdjustParser('400:2;400:3');
    expect(p.factorFor(400)).toBe(3);
    expect(p.factorFor(399)).toBe(3);
  });

  it('throws on invalid segment format', () => {
    expect(() => new ImageSizeAdjustParser('400;1200:1')).toThrow(/Invalid segment/i);
    expect(() => new ImageSizeAdjustParser('400::2')).toThrow(/Invalid segment/i);
    expect(() => new ImageSizeAdjustParser('a:2')).toThrow(/Invalid maxWidth/i);
    expect(() => new ImageSizeAdjustParser('400:')).toThrow(/Missing factor/i);
    expect(() => new ImageSizeAdjustParser('400:-1')).toThrow(/Invalid factor/i);
    expect(() => new ImageSizeAdjustParser('400:abc')).toThrow(/Invalid factor/i);
    expect(() => new ImageSizeAdjustParser('-1:2')).toThrow(/Invalid maxWidth/i);
  });

  it('throws for invalid screen width in factorFor', () => {
    const p = new ImageSizeAdjustParser('400:2');
    expect(() => p.factorFor(NaN as any)).toThrow(/Invalid screen width/i);
    expect(() => p.factorFor(-5)).toThrow(/Invalid screen width/i);
  });
});
```