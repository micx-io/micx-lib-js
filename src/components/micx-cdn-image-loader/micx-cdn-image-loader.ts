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
      try {
        this._imageDefaultSizeAdjustment = (new ImageSizeAdjustParser(newVal)).getSizeAdjustment();

      } catch (e) {
        this.error("Failed to parse default-size-adjust=", newVal , e);
        this._imageDefaultSizeAdjustment = 1; // Fallback to default size adjustment
      }
      this.log("Default size adjustment updated to:", this._imageDefaultSizeAdjustment);
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

    new MicxCdnImgElement(image, this._imageDefaultSizeAdjustment, this._debug);
  }
}

customElements.define("micx-cdn-image-loader", MicxCdnImageLoader);