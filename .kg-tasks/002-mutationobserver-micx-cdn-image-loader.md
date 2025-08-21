---
slugName: mutationobserver-micx-cdn-image-loader
includeFiles:
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
editFiles:
- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts
original_prompt: Füge einen MutationObserver zu micx-cd-image-loder komponente hinzu,
  der alle unterelemente darauf überwacht, ob ein img tag hinzugefügt wird. in diesem
  fall soll eine private methode onImageAdded aufgerufen werden, die noch nicht implementiert
  wird. Der observer soll auf geschwindigkeit optimiert arbeiten und wenig ressourcen
  verbrauchen. Bereits gesetzt Image elemente sollen die private methode übergeben
  werden, falls der observer später gestartet werden sollte.
---
# Prepare MutationObserver for micx-cdn-image-loader

Add a performant MutationObserver to the micx-cdn-image-loader component that watches its subtree for added <img> elements and invokes a private onImageAdded method for each discovered image. Also handle images that already exist when observation starts.

## Assumptions

- The referenced component is micx-cdn-image-loader (typo corrected from “micx-cd-image-loder”).
- onImageAdded should be declared but not implemented (empty body with TODO).
- The component does not use Shadow DOM; we observe only the element’s light DOM subtree.
- Efficiency: use a single observer instance, only childList + subtree, batch image handling via microtask, avoid re-processing with WeakSet.

## Tasks

- Add performant MutationObserver Track added img elements and call onImageAdded for each
- Process existing images on start Initial scan so late start still handles existing imgs
- Add lifecycle and cleanup Start in connectedCallback; disconnect in disconnectedCallback
- Provide onImageAdded stub Private method with empty implementation

## Overview: File changes

- ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts Implement observer, batching, lifecycle hooks, and method stub

## Detail changes

### ./src/components/micx-cdn-image-loader/micx-cdn-image-loader.ts

Replace entire file with the following content:

```typescript
import { LoggingMixin } from "@trunkjs/browser-utils";

export class MicxCdnImageLoader extends LoggingMixin(HTMLElement) {
  private _observer?: MutationObserver;
  private _seen = new WeakSet<HTMLImageElement>();
  private _pending = new Set<HTMLImageElement>();
  private _scheduled = false;

  connectedCallback() {
    // Start observing when connected
    this.startObserving();
  }

  disconnectedCallback() {
    this.stopObserving();
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
    this._pending.clear();
    // Do not clear _seen -> prevents re-processing on re-connect with same nodes
  }

  /**
   * Enqueue an <img> for batched processing.
   */
  private _enqueue(img: HTMLImageElement): void {
    if (this._seen.has(img) || this._pending.has(img)) return;
    this._pending.add(img);

    if (!this._scheduled) {
      this._scheduled = true;
      queueMicrotask(() => this._flush());
    }
  }

  /**
   * Flush batched images and invoke onImageAdded once per unique <img>.
   */
  private _flush(): void {
    this._scheduled = false;
    if (this._pending.size === 0) return;

    for (const img of this._pending) {
      this._pending.delete(img);
      if (!this._seen.has(img)) {
        this._seen.add(img);
        try {
          this.onImageAdded(img);
        } catch (e) {
          // Keep observer resilient against errors in handler
          if ((this as any).logError) {
            (this as any).logError("onImageAdded error", e);
          }
        }
      }
    }
  }

  /**
   * Called whenever an <img> element is discovered within this component.
   * Not implemented yet.
   */
  private onImageAdded(image: HTMLImageElement): void {
    // TODO: implement image handling
  }
}
```

## Example improved prompts

- Ergänze die Komponente micx-cdn-image-loader um einen performanten MutationObserver (childList+subtree), der neu hinzugefügte <img>-Tags im Unterbaum erkennt, onImageAdded(img) aufruft, beim Start bereits vorhandene Bilder verarbeitet und in disconnectedCallback aufräumt. onImageAdded soll nur als leere private Methode deklariert werden. Bitte dedupliziere mit WeakSet und führe die Aufrufe batched per queueMicrotask aus.