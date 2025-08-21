import {Debouncer, LoggingMixin} from "@trunkjs/browser-utils";
import {micxCdnImgElement, MicxCdnImgElement} from "../../lib/mediastore/MicxCdnImgElement";


const debounceResize = new Debouncer(500, 1000);

export class MicxCdnImageLoader extends LoggingMixin(HTMLElement) {
  private _observer?: MutationObserver;
  private _seen = new WeakSet<HTMLImageElement>();


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
   * Not implemented yet.
   */
  private onImageAdded(image: HTMLImageElement): void {

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

    new MicxCdnImgElement(image, parseInt(image.getAttribute("micx_cdn_idx") || "0"));
  }
}

customElements.define("micx-cdn-image-loader", MicxCdnImageLoader);