---
slugName: imagesizeadjustparser-strict-instance-api
includeFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/lib/mediastore/ImageSizeAdjustParser.test.ts
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
editFiles:
- ./src/lib/mediastore/ImageSizeAdjustParser.ts
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
original_prompt: passe die ImageSizeAdjustParser klasse so an, dass :2;480:1.5;1200:1
  bedeutet 2 für unter ab 480 1.5 bis 1200 dann 1. :2 heisst default gleich 2 genaus
  so wie 2 heisst auch default 2. alle anderen syntaxen entfernen und exception auslösen.
  Scale can be also floats like 1.5 or 0.4. Keep the code short and readable. Die
  rules sollten dem ImageSizeAdjustParser im constrcutor übergeben werden und über
  die methode getSizeAdjustment ausgelesen werden als optionaler paramter die Bereite
  und ein default-wert 1 angegeben werden kann.
---
# Prepare Adapt ImageSizeAdjustParser to strict syntax and instance API

Implement a strict, short, and readable ImageSizeAdjustParser that:
- Only accepts the syntax: ":<scale>;<min>:<scale>;..." or a single "<scale>".
- Scales are floats (e.g., 1.5, 0.4), non-negative.
- Any other syntax must throw.
- Rules are provided to the parser via its constructor.
- Provide an instance method getSizeAdjustment(width?: number, defaultScale = 1) to evaluate the scale.
- Integrate with micx-cdn-image-loader to use the new instance API and fix existing TS errors.

Assumptions
- getSizeAdjustment’s width parameter is optional; if omitted or invalid, window.innerWidth is used when available, otherwise the defaultScale is returned.
- The static API (parse, fromElement, getScaleForWidth) remains for backwards compatibility and testing.
- default-size-adjust attribute contains the strict format string; when unset or blank, default scale is 1.
- On attribute update or resize, we recompute the default scale used when creating MicxCdnImgElement.

Example prompts to improve the original request
- “Bitte füge dem ImageSizeAdjustParser eine Instanz-API hinzu, bei der die Regeln im Konstruktor als String übergeben werden, und implementiere getSizeAdjustment(width?: number, defaultScale?: number).”
- “Wirf Ausnahmen für jede Syntax außer ‘:2;480:1.5;1200:1’ oder ‘2’. Skalen sind Gleitkommazahlen ≥ 0.”

## Tasks

- strict-parser-instance Implement strict parser with constructor and getSizeAdjustment, keep static API
- integrate-loader Use the new instance parser in micx-cdn-image-loader and fix TS/logic issues

## Overview: File changes

- ./src/lib/mediastore/ImageSizeAdjustParser.ts Add constructor, rules property, getSizeAdjustment; keep strict parsing; keep static APIs
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts Use new instance API, compute default scale, fix TypeScript errors and logging

## Detail changes

### ./src/lib/mediastore/ImageSizeAdjustParser.ts

Referenced Tasks
- strict-parser-instance Implement strict parser with constructor and getSizeAdjustment, keep static API

Replace

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

by

```typescript
/**
 * Strict ImageSizeAdjustParser
 * - Supported:
 *   - ":<scale>" default in lists
 *   - "<min>:<scale>" entries
 *   - ";" as separator
 *   - single "<scale>" means default (min=0)
 * - Scales are floats >= 0. Any other syntax throws.
 */
export interface SizeRule {
  minScreen: number;
  scale: number;
}
export type ImageSizeAdjustmentRules = SizeRule[];

export class ImageSizeAdjustParser {
  public readonly rules: ImageSizeAdjustmentRules;

  /**
   * Create an instance with given rules.
   * @param rulesInput string using strict syntax or a pre-parsed rules array
   */
  constructor(rulesInput?: string | ImageSizeAdjustmentRules) {
    if (Array.isArray(rulesInput)) {
      this.rules = [...rulesInput].sort((a, b) => a.minScreen - b.minScreen);
    } else if (typeof rulesInput === 'string') {
      this.rules = ImageSizeAdjustParser.parse(rulesInput);
    } else {
      this.rules = [];
    }
  }

  /**
   * Evaluate the scale for a given width. If width is not provided or invalid,
   * window.innerWidth is used when available; otherwise defaultScale is returned.
   */
  public getSizeAdjustment(width?: number, defaultScale = 1): number {
    const w = Number.isFinite(width as number) && (width as number) >= 0
      ? (width as number)
      : (typeof window !== 'undefined' ? window.innerWidth : NaN);
    return ImageSizeAdjustParser.getScaleForWidth(this.rules, w, defaultScale);
  }

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
        if (min < 0) throw new Error(`Invalid min width: ${min}`);
        rules.set(min, scale);
        continue;
      }

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

  public static getScaleForWidth(
    rules: ImageSizeAdjustmentRules,
    width: number,
    defaultScale = 1
  ): number {
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

### ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts

Referenced Tasks
- integrate-loader Use the new instance parser in micx-cdn-image-loader and fix TS/logic issues

Replace

```typescript
import {Debouncer, LoggingMixin} from "@trunkjs/browser-utils";
import {micxCdnImgElement, MicxCdnImgElement} from "../../lib/mediastore/MicxCdnImgElement";
import {MicxImageUrlDecoderV2} from "../../lib/mediastore/MicxImageUrlDecoderV2";
import {ImageSizeAdjustParser} from "../../lib/mediastore/ImageSizeAdjustParser";


const debounceResize = new Debouncer(500, 1000);

export class MicxCdnImageLoader extends LoggingMixin(HTMLElement) {
  static get observedAttributes() {
    return ["default-size-adjust"];
  }

  private _observer?: MutationObserver;
  private _seen = new WeakSet<HTMLImageElement>();

  private _imageDefaultSizeAdjustment = 1;

  private onResize = async ()=> {
    await debounceResize.wait();
    this.log("Resize event detected, reprocessing images");
    this.querySelectorAll("img").forEach((img) => {
      micxCdnImgElement(img)?.reload()
    });
  }


  connectedCallback() {
    // Start observing when connected
    this.startObserving();

    // If Tree was already rendered, process existing images
    const imgs = this.querySelectorAll?.("img");
    if (imgs && imgs.length) {
      imgs.forEach((img : any) => queueMicrotask(() => this._enqueue(img)));
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
    queueMicrotask(()=>this.onImageAdded(img));
  }


  attributeChangedCallback(name : string, oldValue: any, newVal: any): void {
    // This method is called when properties change,
    // but we don't need to handle any properties for now.
    // If needed, we can implement logic here to handle specific property changes.
    this.log("Properties changed:", name);
    if (name === "default-size-adjust") {
      const sizeParser = new ImageSizeAdjustParser();
      this._imageDefaultSizeAdjustment = ImageSizeAdjustParser.getScaleForWidth(sizeParser.rules, window.innerWidth, 1);
      this.log("Default size adjustment updated to:", this._imageDefault
    }
  }


  /**
   * Called whenever an <img> element is discovered within this component.
   * Not implemented yet.
   */
  private onImageAdded(image: HTMLImageElement): void {
    if ( ! MicxImageUrlDecoderV2.isCdnImage(image.src || image.getAttribute("data-src"))) {
      this.log("Image is not a CDN image, skipping:", image);
      return; // Not a CDN image
    }

    if ( ! image.hasAttribute("loading")) {
      image.setAttribute("loading", "lazy");
    }
    if ( ! image.hasAttribute("src")) {
      if (!image.hasAttribute("data-src")) {
        this.warn("Image without src or data-src found, skipping:", image);
        return; // Skip images without src or data-src
      }
      image.src = image.getAttribute("data-src");
    }
    if ( ! image.hasAttribute("data-src")) {
      image.setAttribute("data-src", image.src); // Store original src in data-src
    }

    let defaultSizeAdjustment = 0;
    new MicxCdnImgElement(image, defaultSizeAdjustment);
  }
}

customElements.define("micx-cdn-image-loader", MicxCdnImageLoader);
```

by

```typescript
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
    // Recompute default scale (depends on viewport width)
    const defStr = this.getAttribute("default-size-adjust") ?? "";
    const parser = new ImageSizeAdjustParser(defStr);
    this._imageDefaultSizeAdjustment = parser.getSizeAdjustment(window.innerWidth, 1);

    this.log("Resize event detected, reprocessing images. Default scale:", this._imageDefaultSizeAdjustment);
    this.querySelectorAll("img").forEach((img) => {
      micxCdnImgElement(img)?.reload();
    });
  };

  connectedCallback() {
    // Initialize default size adjustment from attribute
    const defStr = this.getAttribute("default-size-adjust") ?? "";
    const parser = new ImageSizeAdjustParser(defStr);
    this._imageDefaultSizeAdjustment = parser.getSizeAdjustment(window.innerWidth, 1);

    // Start observing when connected
    this.startObserving();

    // If tree was already rendered, process existing images
    const imgs = this.querySelectorAll("img");
    if (imgs && imgs.length) {
      imgs.forEach((img) => queueMicrotask(() => this._enqueue(img)));
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

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === "default-size-adjust") {
      const parser = new ImageSizeAdjustParser(newValue ?? "");
      this._imageDefaultSizeAdjustment = parser.getSizeAdjustment(window.innerWidth, 1);
      this.log("Default size adjustment updated to:", this._imageDefaultSizeAdjustment);

      // Optionally reprocess images when the configuration changes
      this.querySelectorAll("img").forEach((img) => {
        micxCdnImgElement(img)?.reload();
      });
    }
  }

  /**
   * Called whenever an <img> element is discovered within this component.
   */
  private onImageAdded(image: HTMLImageElement): void {
    if (!MicxImageUrlDecoderV2.isCdnImage(image.src || image.getAttribute("data-src") || "")) {
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
      const ds = image.getAttribute("data-src");
      if (ds) image.src = ds;
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

Notes:
- Fixes a syntax error in connectedCallback (querySelectorAll?.("img") -> querySelectorAll("img")).
- Repairs attributeChangedCallback to compute default size via new instance API and logs correctly.
- Recomputes default scale on resize so it matches current viewport width.

## Missing Information

- If there should be an automatic re-creation of MicxCdnImgElement instances when default-size-adjust changes, confirm whether to recreate or only reload(). Current implementation triggers reload().
- Clarify whether negative scale values should be rejected (current strict parser rejects via regex). If a clamp is desired, specify bounds.

