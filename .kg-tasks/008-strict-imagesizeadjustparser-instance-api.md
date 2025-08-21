---
slugName: strict-imagesizeadjustparser-instance-api
includeFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
editFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
original_prompt: passe die ImageSizeAdjustParser klasse so an, dass :2;480:1.5;1200:1
  bedeutet 2 für unter ab 480 1.5 bis 1200 dann 1. :2 heisst default gleich 2 genaus
  so wie 2 heisst auch default 2. alle anderen syntaxen entfernen und exception auslösen.
  Scale can be also floats like 1.5 or 0.4. Keep the code short and readable. Die
  rules sollten dem ImageSizeAdjustParser im constrcutor übergeben werden und über
  die methode getSizeAdjustment ausgelesen werden als optionaler paramter die Bereite
  und ein default-wert 1 angegeben werden kann. Nutze keine static methods.
---
# Prepare Strict ImageSizeAdjustParser with instance API

Adapt ImageSizeAdjustParser to a strict, minimal syntax and an instance-based API:
- Only allow: ":<scale>;<min>:<scale>;..." where scale is a positive float, min is a non-negative integer.
- A single "<scale>" means default scale.
- Throw on any other syntax.
- No static methods; pass rules to constructor and expose getSizeAdjustment(width?, default=1).
- Update micx-cdn-image-loader to use the new API and fix existing issues.

## Assumptions

- Negative scales are not supported by design and treated as invalid (syntax does not allow a leading minus).
- Width defaults to provided default value when rules are empty or width is invalid.
- getSizeAdjustment should use the provided width; if omitted or invalid, treat as applying “default then the last rule by minScreen order” (same behavior as width >= all min thresholds).
- Consumers only need the instance API; the static API is removed.
- We update the affected unit tests to reflect the new API.

## Missing Information

- None. If you want different handling of zero scale or negative values, specify acceptable range.

## Tasks

- implement-instance-parser Strict, short, readable parser; constructor parses, getSizeAdjustment returns scale
- update-loader-use-parser Fix attribute handling, compute default adjustment, pass to MicxCdnImgElement
- update-tests-instance-api Rewrite tests to use constructor/getSizeAdjustment and ensure exceptions on invalid syntax

## Overview: File changes

- src/lib/mediastore/ImageSizeAdjustParser.ts Replace with instance-based strict parser and getSizeAdjustment
- src/lib/mediastore/ImageSizeAdjustParser.test.ts Replace tests to validate strict syntax and instance API
- src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts Fix invalid code, use new parser API, pass default adjustment

## Detail changes

### src/lib/mediastore/ImageSizeAdjustParser.ts

Referenced Tasks
- implement-instance-parser Implement strict instance parser with getSizeAdjustment, no statics

Replace entire file with:

```ts
/**
 * Strict ImageSizeAdjustParser (instance API).
 * Allowed forms:
 *  - "<scale>"                           -> default only
 *  - ":<scale>;(<min>:<scale>)*"         -> default in list + ranges
 *  - "(<min>:<scale>)(;...)*"            -> ranges only (no default)
 * Notes:
 *  - min: non-negative integer
 *  - scale: positive float (e.g. 1.5, 0.4)
 *  - Any other syntax -> throw Error
 *  - No static methods
 */

export interface SizeRule {
  minScreen: number;
  scale: number;
}
export type ImageSizeAdjustmentRules = SizeRule[];

export class ImageSizeAdjustParser {
  public readonly rules: ImageSizeAdjustmentRules;

  constructor(input?: string | null) {
    const text = (input ?? '').trim();
    if (!text) {
      this.rules = [];
      return;
    }

    // Single default scale: "2" or "1.5"
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      this.rules = [{ minScreen: 0, scale: parseFloat(text) }];
      return;
    }

    const parts = text.split(';').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error('Invalid adjust-sizes input');

    const map = new Map<number, number>();

    for (const p of parts) {
      let m: RegExpMatchArray | null;

      // Default entry: ":2" or ":1.5"
      m = p.match(/^:([0-9]+(?:\.[0-9]+)?)$/);
      if (m) {
        map.set(0, parseFloat(m[1]));
        continue;
      }

      // Range entry: "480:1.5"
      m = p.match(/^([0-9]+):([0-9]+(?:\.[0-9]+)?)$/);
      if (m) {
        const min = parseInt(m[1], 10);
        const scale = parseFloat(m[2]);
        map.set(min, scale);
        continue;
      }

      throw new Error(`Invalid adjust-sizes entry: "${p}"`);
    }

    this.rules = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([minScreen, scale]) => ({ minScreen, scale }));
  }

  /**
   * Returns the scale for the given width.
   * - Picks the rule with the largest minScreen <= width.
   * - If no rules, returns defaultScale (default 1).
   * - If width is omitted or invalid, behaves like "use the last applicable rule".
   */
  public getSizeAdjustment(width?: number, defaultScale = 1): number {
    if (!this.rules.length) return defaultScale;

    const validWidth = typeof width === 'number' && isFinite(width) && width >= 0 ? width : undefined;

    let scale = defaultScale;
    for (const r of this.rules) {
      if (validWidth === undefined || validWidth >= r.minScreen) scale = r.scale;
      else break;
    }
    return scale;
  }
}
```

### src/lib/mediastore/ImageSizeAdjustParser.test.ts

Referenced Tasks
- update-tests-instance-api Align tests to instance API and strict parsing

Replace entire file with:

```ts
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

  it('uses defaultScale when no rules or invalid width', () => {
    const empty = new ImageSizeAdjustParser('');
    expect(empty.getSizeAdjustment(800, 1.1)).toBeCloseTo(1.1);

    const p = new ImageSizeAdjustParser(':2;480:1.5');
    expect(p.getSizeAdjustment(NaN as unknown as number, 1.2)).toBeCloseTo(1.5); // last rule wins when width invalid
    expect(p.getSizeAdjustment(-1 as unknown as number, 1.3)).toBeCloseTo(1.5);
  });
});
```

### src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts

Referenced Tasks
- update-loader-use-parser Fix logic to use instance parser and correct bugs

Replace entire file with:

```ts
import { Debouncer, LoggingMixin } from "@trunkjs/browser-utils";
import { micxCdnImgElement, MicxCdnImgElement } from "../../lib/mediastore/MicxCdnImgElement";
import { MicxImageUrlDecoderV2 } from "../../lib/mediastore/MicxImageUrlDecoderV2";
import { ImageSizeAdjustParser } from "../../lib/mediastore/ImageSizeAdjustParser";

const debounceResize = new Debouncer(500, 1000);

export class MicxCdnImageLoader extends LoggingMixin(HTMLElement) {
  static get observedAttributes() {
    return ["default-size-adjust"];
  }

  private _observer?: MutationObserver;
  private _seen = new WeakSet<HTMLImageElement>();
  private _imageDefaultSizeAdjustment = 1;

  private onResize = async () => {
    await debounceResize.wait();
    this.log("Resize event detected, reprocessing images");
    this.querySelectorAll("img").forEach((img) => {
      micxCdnImgElement(img)?.reload();
    });
  };

  connectedCallback() {
    // compute default scale initially (attribute may already be present)
    this._updateDefaultSizeAdjustment(this.getAttribute("default-size-adjust"));

    // Start observing when connected
    this.startObserving();

    // If Tree was already rendered, process existing images
    const imgs = this.querySelectorAll("img");
    if (imgs && imgs.length) {
      imgs.forEach((img: any) => queueMicrotask(() => this._enqueue(img)));
    }

    window.addEventListener("resize", this.onResize);
  }

  disconnectedCallback() {
    this.stopObserving();
    window.removeEventListener("resize", this.onResize);
  }

  /**
   * Starts the MutationObserver and processes already existing images.
   * Optimized for performance: single observer, only childList + subtree,
   * and batched microtask processing.
   */
  public startObserving(): void {
    if (this._observer) return; // already started

    // Initial scan: process already present <img> in subtree
    this.querySelectorAll("img").forEach((img) => this._enqueue(img));

    this._observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type !== "childList" || rec.addedNodes.length === 0) continue;

        for (let i = 0; i < rec.addedNodes.length; i++) {
          const node = rec.addedNodes[i];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const el = node as Element;

          // Fast path: direct IMG
          if (el.tagName === "IMG") {
            this._enqueue(el as HTMLImageElement);
          }
        }
      }
    });

    this._observer.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stops the MutationObserver and clears pending state.
   */
  public stopObserving(): void {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = undefined;
    }
    // Do not clear _seen -> prevents re-processing on re-connect with same nodes
  }

  /**
   * Enqueue an <img> for batched processing.
   */
  private _enqueue(img: HTMLImageElement): void {
    if (this._seen.has(img)) return;
    this._seen.add(img);
    this.log("Enqueuing image for processing", img);
    queueMicrotask(() => this.onImageAdded(img));
  }

  attributeChangedCallback(name: string, _oldValue: any, newVal: any): void {
    if (name === "default-size-adjust") {
      this._updateDefaultSizeAdjustment(newVal as string);
    }
  }

  private _updateDefaultSizeAdjustment(value: string | null): void {
    try {
      const sizeParser = new ImageSizeAdjustParser(value);
      this._imageDefaultSizeAdjustment = sizeParser.getSizeAdjustment(window.innerWidth, 1);
      this.log("Default size adjustment updated to:", this._imageDefaultSizeAdjustment);
    } catch (e) {
      this.warn("Invalid default-size-adjust value:", value, e);
      this._imageDefaultSizeAdjustment = 1;
    }
  }

  /**
   * Called whenever an <img> element is discovered within this component.
   */
  private onImageAdded(image: HTMLImageElement): void {
    const src = image.src || image.getAttribute("data-src") || "";
    if (!MicxImageUrlDecoderV2.isCdnImage(src)) {
      this.log("Image is not a CDN image, skipping:", image);
      return; // Not a CDN image
    }

    if (!image.hasAttribute("loading")) {
      image.setAttribute("loading", "lazy");
    }
    if (!image.hasAttribute("src")) {
      if (!image.hasAttribute("data-src")) {
        this.warn("Image without src or data-src found, skipping:", image);
        return; // Skip images without src or data-src
      }
      image.src = image.getAttribute("data-src")!;
    }
    if (!image.hasAttribute("data-src")) {
      image.setAttribute("data-src", image.src); // Store original src in data-src
    }

    const defaultSizeAdjustment = this._imageDefaultSizeAdjustment;
    new MicxCdnImgElement(image, defaultSizeAdjustment);
  }
}

customElements.define("micx-cdn-image-loader", MicxCdnImageLoader);
```

## Example prompts to refine requirements

- Please confirm if scale value 0 is allowed, or should we enforce strictly > 0?
- Should getSizeAdjustment use window.innerWidth when width is omitted, or always require width?
- Do you want a helper to read rules from an element attribute (e.g., fromElement) even though static methods are not desired?

