---
slugName: image-size-adjust-parser
includeFiles:
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
- ./src/lib/mediastore/MicxCdnImgElement.ts
- ./src/lib/mediastore/MicxCdnImageObserver.ts
- ./src/lib/helper/ImageSizeAdjustParser.ts
- ./src/lib/helper/ImageSizeAdjustParser.test.ts
editFiles:
- ./src/lib/helper/ImageSizeAdjustParser.ts
- ./src/lib/helper/ImageSizeAdjustParser.test.ts
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
- ./src/lib/mediastore/MicxCdnImgElement.ts
- ./src/lib/mediastore/MicxCdnImageObserver.ts
original_prompt: entwickle eine klasse ImageSizeAdustParser, dieser bekommt Daten
  in der Form 400:2;1200:1 d.h. bis 400 px screen breite wird 2 zurück gegeben bis
  1200:1 alles darüber wird per default mit 1 zurück gegeben. Wenn ein leerer string
  übergeben wird immer eins. Ein Semikolon ohne wert dahinter auch als ein definieren.
  Damit können die Bilder abhängig von der Größe des bildschirms in einer höheren
  auflösung geladen werden.
---
# Prepare ImageSizeAdjustParser

Implementiere eine Klasse ImageSizeAdjustParser, die Strings wie "400:2;1200:1" in Zoom-Faktoren je Bildschirmbreite auswertet. Integriere sie in den bestehenden CDN-Image-Flow, sodass abhängig von der Screen-Breite höher aufgelöste Bilder geladen werden.

Definitionen:
- "400:2;1200:1" bedeutet: bis einschließlich 400px → 2; bis einschließlich 1200px → 1; darüber → 1 (Default).
- Leerer String → immer 1.
- Ein Semikolon ohne Wert dahinter zählt als „Default 1“-Definition (z. B. "400:2;" ⇒ über 400px → 1).

## Assumptions

- Faktor darf Dezimal sein (z. B. 1.25). Ungültige oder ≤ 0 Werte werden als 1 behandelt.
- Der Faktor beeinflusst ausschließlich die Auswahl der HiRes-Breite in MicxCdnImgElement.loadHiRes (nicht die HTML width/height-Attribute).
- Attribut adjust-sizes ist am Custom Element <micx-cdn-image-loader> gesetzt und gilt für alle darunterliegenden Bilder.
- Bei Resize wird der Faktor neu berechnet und auf bestehende Instanzen angewandt.
- Zur Vermeidung doppelter Instanzen wird MicxCdnImgElement im WeakMap registriert (auch wenn per new erstellt).

## Missing Information

- Soll adjust-sizes auch die initialen width/height-Attribute (Platzhaltergröße) beeinflussen? Aktuell: nein, nur HiRes-Auswahl.
- Soll negativer/0-Faktor explizit fehlschlagen oder still auf 1 fallen? Aktuell: still auf 1.

Wenn Anpassung gewünscht: Bitte spezifizieren.

## Example prompts to improve the original request

- "Bitte integriere den Parser in micx-cdn-image-loader via Attribut adjust-sizes und aktualisiere bei window.resize dynamisch."
- "Bitte erweitere MicxCdnImgElement so, dass ein Size-Faktor gesetzt und zur Auswahl der besten Breite verwendet wird."
- "Bitte schreibe Vitest-Tests für die Parser-Fälle '', '400:2;1200:1', '400:2;', '  800:1.5 ; '."

## Tasks

- Parser implementieren Klasse ImageSizeAdjustParser, parse und getFactor (inkl. Edgecases, Tests)
- MicxCdnImgElement erweitern Size-Faktor in Konstruktor, Setter, Anwendung bei HiRes-Auswahl; Instanz-WeakMap setzen
- Loader integrieren adjust-sizes einlesen, Faktor berechnen, bei onImageAdded und onResize anwenden
- Observer auf Factory micxCdnImgElement umstellen, um Doppel-Instanzen zu vermeiden

## Overview: File changes

- ./src/lib/helper/ImageSizeAdjustParser.ts Neue Utility-Klasse mit parse/getFactor
- ./src/lib/helper/ImageSizeAdjustParser.test.ts Vitest-Tests für Parser
- ./src/lib/mediastore/MicxCdnImgElement.ts Klasse erweitern um Size-Faktor; WeakMap-Handling; Anpassung Breitenlogik
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts adjust-sizes integrieren; Faktor berechnen und anwenden
- ./src/lib/mediastore/MicxCdnImageObserver.ts auf micxCdnImgElement Factory umstellen

## Detail changes

### ./src/lib/helper/ImageSizeAdjustParser.ts

Referenced Tasks
- Parser implementieren

Replace entire file with:

```typescript
export type ImageSizeAdjustRule = {
  maxWidth: number; // inclusive; use Number.POSITIVE_INFINITY for default
  factor: number;   // >= 0; invalid or <=0 coerced to 1
};

export class ImageSizeAdjustParser {
  /**
   * Parse a definition string into ordered rules.
   * Examples:
   * - "400:2;1200:1"  => [{<=400 => 2}, {<=1200 => 1}, {<=Infinity => 1}]
   * - "400:2;"        => [{<=400 => 2}, {<=Infinity => 1}]
   * - ""              => [{<=Infinity => 1}]
   */
  static parse(definition: string | null | undefined): ImageSizeAdjustRule[] {
    const rules: ImageSizeAdjustRule[] = [];

    const addRule = (max: number, factor: number) => {
      const f = !isFinite(factor) || factor <= 0 ? 1 : factor;
      const m = !isFinite(max) || max < 0 ? Number.POSITIVE_INFINITY : max;
      rules.push({ maxWidth: m, factor: f });
    };

    const def = (definition ?? '').trim();
    if (def.length === 0) {
      addRule(Number.POSITIVE_INFINITY, 1);
      return rules;
    }

    const parts = def.split(';');
    let hasDefault = false;

    for (const raw of parts) {
      const token = raw.trim();
      if (token === '') {
        // Semicolon without value => define default=1
        hasDefault = true;
        continue;
      }

      const [maxStr, factorStr] = token.split(':').map((s) => (s ?? '').trim());

      const max = parseInt(maxStr, 10);
      const factor = parseFloat(factorStr);

      if (Number.isFinite(max) && max >= 0 && Number.isFinite(factor)) {
        addRule(max, factor);
      } else {
        // Invalid pair -> ignore
      }
    }

    // Sort ascending by maxWidth
    rules.sort((a, b) => a.maxWidth - b.maxWidth);

    // Ensure default
    if (!hasDefault) {
      addRule(Number.POSITIVE_INFINITY, 1);
    } else {
      // Only add default once if not already present
      const hasInf = rules.some((r) => r.maxWidth === Number.POSITIVE_INFINITY);
      if (!hasInf) addRule(Number.POSITIVE_INFINITY, 1);
    }

    return rules;
  }

  /**
   * Resolve factor for a given viewport width.
   */
  static getFactor(definition: string | null | undefined, viewportWidth: number | null | undefined): number {
    const w = typeof viewportWidth === 'number' && isFinite(viewportWidth) ? viewportWidth : 0;
    const rules = this.parse(definition);
    for (const r of rules) {
      if (w <= r.maxWidth) return r.factor;
    }
    return 1; // Fallback (should not be reached due to ensured default)
  }
}
```

### ./src/lib/helper/ImageSizeAdjustParser.test.ts

Referenced Tasks
- Parser implementieren

Create file with:

```typescript
import { describe, it, expect } from 'vitest';
import { ImageSizeAdjustParser } from './ImageSizeAdjustParser';

describe('ImageSizeAdjustParser.parse', () => {
  it('returns default 1 for empty string', () => {
    const rules = ImageSizeAdjustParser.parse('');
    expect(rules).toHaveLength(1);
    expect(rules[0].maxWidth).toBe(Number.POSITIVE_INFINITY);
    expect(rules[0].factor).toBe(1);
  });

  it('parses "400:2;1200:1" and appends default 1', () => {
    const rules = ImageSizeAdjustParser.parse('400:2;1200:1');
    expect(rules.map(r => [r.maxWidth, r.factor])).toEqual([
      [400, 2],
      [1200, 1],
      [Number.POSITIVE_INFINITY, 1],
    ]);
  });

  it('treats trailing semicolon as default=1', () => {
    const rules = ImageSizeAdjustParser.parse('400:2;');
    expect(rules.map(r => [r.maxWidth, r.factor])).toEqual([
      [400, 2],
      [Number.POSITIVE_INFINITY, 1],
    ]);
  });

  it('ignores invalid pairs and still ensures default', () => {
    const rules = ImageSizeAdjustParser.parse('abc:2;800:xyz; 1200:1.5 ; ;');
    expect(rules.map(r => [r.maxWidth, r.factor])).toEqual([
      [1200, 1.5],
      [Number.POSITIVE_INFINITY, 1],
    ]);
  });
});

describe('ImageSizeAdjustParser.getFactor', () => {
  it('returns 1 for empty definition', () => {
    expect(ImageSizeAdjustParser.getFactor('', 300)).toBe(1);
    expect(ImageSizeAdjustParser.getFactor('', 5000)).toBe(1);
  });

  it('resolves correct factor by viewport', () => {
    const def = '400:2;1200:1';
    expect(ImageSizeAdjustParser.getFactor(def, 0)).toBe(2);
    expect(ImageSizeAdjustParser.getFactor(def, 400)).toBe(2);
    expect(ImageSizeAdjustParser.getFactor(def, 401)).toBe(1);
    expect(ImageSizeAdjustParser.getFactor(def, 1200)).toBe(1);
    expect(ImageSizeAdjustParser.getFactor(def, 1201)).toBe(1);
  });

  it('handles decimals and whitespace', () => {
    const def = ' 800:1.5 ; ';
    expect(ImageSizeAdjustParser.getFactor(def, 799)).toBe(1.5);
    expect(ImageSizeAdjustParser.getFactor(def, 800)).toBe(1.5);
    expect(ImageSizeAdjustParser.getFactor(def, 801)).toBe(1);
  });
});
```

### ./src/lib/mediastore/MicxCdnImgElement.ts

Referenced Tasks
- MicxCdnImgElement erweitern
- Loader Integration (Size-Faktor anwenden)

Replace entire file with:

```typescript
import {MicxImageUrlDecoderV2, MicxImageUrlDecoderV2Result} from "./MicxImageUrlDecoderV2";
import {MicxImageUrlEncoderV2} from "./MicxImageUrlEncoderV2";
import {dom_ready, sleep} from "../helper/functions";
import {waitForDomContentLoaded, waitForLoad} from "@trunkjs/browser-utils";

const loadDirect = 2;
const innerWidth = window.innerWidth;

const cdnWeakMap = new WeakMap<HTMLImageElement, MicxCdnImgElement>();

export function micxCdnImgElement(image: HTMLImageElement, sizeFactor: number = 1): MicxCdnImgElement | null {
  if (cdnWeakMap.has(image)) {
    const e = cdnWeakMap.get(image) ?? null;
    if (e) e.setSizeFactor(sizeFactor);
    return e;
  }

  // Only v2 encoded images
  if (image.src.indexOf("/v2/") === -1)
    return null;

  const e = new MicxCdnImgElement(image, parseInt(image.getAttribute("micx_cdn_idx") || "0"), sizeFactor);
  cdnWeakMap.set(image, e);
  return e;
}

export class MicxCdnImgElement {
  private base: string;
  private path: string;
  private origUri: string;
  private myElementIndex: number;
  private isPreloaded = false;
  private sizeFactor = 1; // Multiplier for selecting HiRes width

  public constructor(public readonly image: HTMLImageElement, index: number, sizeFactor: number = 1) {
    this.myElementIndex = index;
    this.setSizeFactor(sizeFactor);

    // register in map to avoid duplicates
    cdnWeakMap.set(image, this);

    let uri = image.src;
    this.origUri = uri;
    uri.replace(/^(.*?\/)(v2\/.*)$/, (p0, base, path) => {
      this.base = base;
      this.path = path;
      return "";
    });

    const dimensions = MicxImageUrlDecoderV2.decode(this.path);
    this.setOptimalImageDimensions(dimensions);

    image.classList.add("micx-image-loader");

    if (uri.endsWith(".svg")) {
      return; // SVG images come in the right size
    }

    if (this.image.getAttribute("loading") === "eager") {
      // Load eager images directly (LCP)
      this.loadHiRes(dimensions);
      return;
    }

    const listener = async () => {
      await waitForLoad();
      this.image.removeEventListener("load", listener);
      this.loadHiRes(dimensions);
    };

    if (this.image.complete === true || this.myElementIndex < loadDirect) {
      listener(); // Preview already loaded, call listener immediately
    } else {
      // Preview not loaded yet, wait for it (e.g. lazy loading)
      this.image.addEventListener("load", listener);
    }
  }

  public setSizeFactor(f: number) {
    if (!isFinite(f) || f <= 0) {
      this.sizeFactor = 1;
    } else {
      this.sizeFactor = f;
    }
  }

  public reload() {
    const dimensions = MicxImageUrlDecoderV2.decode(this.path);
    this.loadHiRes(dimensions);
  }

  private async loadHiRes(dimensions: MicxImageUrlDecoderV2Result) {
    await waitForDomContentLoaded();
    await sleep(40); // Settle image size

    // detect actual dimensions of image element (Fallback innerWidth for Safari)
    let w = this.image.getBoundingClientRect().width;
    if (w === 0 || w === null) w = innerWidth;

    const effectiveWidth = w * this.sizeFactor;

    // Get best fitting width from dimensions (widths are sorted desc)
    let bestWidth = parseInt(dimensions.widths[0]);
    for (const wn of dimensions.widths) {
      const wnI = parseInt(wn);
      if (wnI < effectiveWidth) {
        break;
      }
      bestWidth = wnI;
    }

    console.log(
      `MicxCdnImgElement: Best fitting width for ${dimensions.filename} is ${bestWidth}px (effective=${effectiveWidth.toFixed(2)}, factor=${this.sizeFactor})`
    );

    const e2 = new MicxImageUrlEncoderV2(dimensions.id, dimensions.filename);
    e2.setReatio(dimensions.aspectRatio);
    e2.addWidth(bestWidth);
    e2.setExtensions(dimensions.extensions);
    const url = this.base + "/" + e2.toString();

    this.image.style.backgroundSize = "cover";
    this.image.style.backgroundImage = "url(" + this.origUri + ")";
    this.image.setAttribute("src", url);

    this.image.addEventListener("load", () => {
      this.image.style.backgroundImage = "none";
      this.image.classList.add("loaded");
    });
  }

  /**
   * Set the Image Dimensions to the optimal (best width) for the current screen size
   */
  private setOptimalImageDimensions(dimensions: MicxImageUrlDecoderV2Result) {
    const aspectRatioMultiplier = dimensions.aspectRatio.split("/").map((v) => parseInt(v));
    const aspectRatio = aspectRatioMultiplier[0] / aspectRatioMultiplier[1];

    let w = parseInt(dimensions.widths[0]);
    for (const wn of dimensions.widths) {
      const wnI = parseInt(wn);
      if (wnI < innerWidth) {
        break;
      }
      w = wnI;
    }

    if (this.myElementIndex >= loadDirect) {
      // set lazy loading
      this.image.setAttribute("loading", "lazy");
      this.image.setAttribute("src", this.image.getAttribute("src")!);
    }
    this.image.setAttribute("width", w.toString());
    this.image.setAttribute("height", (w / aspectRatio).toString());

    this.image.classList.add("micx-image-loader");

    if (this.image.hasAttribute("alt") === false)
      this.image.setAttribute("alt", dimensions.filename);
  }

}
```

### ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts

Referenced Tasks
- Loader Integration (adjust-sizes einlesen und anwenden)

Replace entire file with:

```typescript
import {Debouncer, LoggingMixin} from "@trunkjs/browser-utils";
import {micxCdnImgElement} from "../../lib/mediastore/MicxCdnImgElement";
import {MicxImageUrlDecoderV2} from "../../lib/mediastore/MicxImageUrlDecoderV2";
import { ImageSizeAdjustParser } from "../../lib/helper/ImageSizeAdjustParser";

const debounceResize = new Debouncer(500, 1000);

export class MicxCdnImageLoader extends LoggingMixin(HTMLElement) {
  private _observer?: MutationObserver;
  private _seen = new WeakSet<HTMLImageElement>();

  private getSizeFactor(): number {
    const def = this.getAttribute("adjust-sizes");
    const factor = ImageSizeAdjustParser.getFactor(def, window.innerWidth);
    return factor;
  }

  private onResize = async ()=> {
    await debounceResize.wait();
    const factor = this.getSizeFactor();
    this.log("Resize event detected, reprocessing images with factor", factor);
    this.querySelectorAll("img").forEach((img) => {
      const inst = micxCdnImgElement(img);
      if (inst) {
        inst.setSizeFactor(factor);
        inst.reload();
      }
    });
  }

  connectedCallback() {
    // Start observing when connected
    this.startObserving();
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
            continue;
          }

          // Only query inside the added subtree (avoid scanning entire DOM)
          const imgs = el.querySelectorAll?.("img");
          if (imgs && imgs.length) {
            imgs.forEach((img) => this._enqueue(img));
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
    queueMicrotask(()=>this.onImageAdded(img));
  }

  /**
   * Called whenever an <img> element is discovered within this component.
   */
  private onImageAdded(image: HTMLImageElement): void {
    const srcCandidate = image.src || image.getAttribute("data-src") || "";
    if (!MicxImageUrlDecoderV2.isCdnImage(srcCandidate)) {
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

    const factor = this.getSizeFactor();
    // create or get existing instance and apply factor
    const idx = parseInt(image.getAttribute("micx_cdn_idx") || "0");
    image.setAttribute("micx_cdn_idx", "" + idx);
    const inst = micxCdnImgElement(image, factor);
    // if factory returned null (not v2), skip silently
    if (!inst) return;
  }
}

customElements.define("micx-cdn-image-loader", MicxCdnImageLoader);
```

### ./src/lib/mediastore/MicxCdnImageObserver.ts

Referenced Tasks
- Observer auf Factory umstellen

Replace entire file with:

```typescript
import {micxCdnImgElement} from "./MicxCdnImgElement";
import {sleep} from "../helper/functions";
import {MicxImageUrlDecoderV2} from "./MicxImageUrlDecoderV2";

let cdnIdx = 0;
export class MicxCdnImageObserver {

  private applyToImg(image: HTMLImageElement) {
    if ((image as any)["micx_cdn_observer"] === true)
      return;
    (image as any)["micx_cdn_observer"] = true;

    if (!MicxImageUrlDecoderV2.isCdnImage(image.src))
      return; // Not a CDN v2 encoded image

    if (!image.hasAttribute("micx_cdn_idx"))
      image.setAttribute("micx_cdn_idx", "" + cdnIdx++);

    // Use factory to avoid duplicate instances and register in WeakMap
    micxCdnImgElement(image);
  }

  public async observe() {
    let round = 1;
    while (true) {
      await sleep(25 * round++);
      document.querySelectorAll("img").forEach(img => {
        this.applyToImg(img);
      });

      if (round > 50)
        round = 50;
    }
  }

}
```

## Notes for QA

- Run tests: npm test (Vitest). New tests cover parser.
- Manual check:
  - <micx-cdn-image-loader adjust-sizes="400:2;1200:1"> wrap images; resize window; observe console log selecting larger widths for <= 400.
  - Ensure no duplicated loads on resize and no duplicate instances (WeakMap).

