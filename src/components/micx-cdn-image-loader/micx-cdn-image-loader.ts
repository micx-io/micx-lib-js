import {Debouncer, LoggingMixin, sleep, waitForDomContentLoaded, waitForLoad} from "@trunkjs/browser-utils";
import {MicxImageUrlDecoderV2} from "../../lib/mediastore/MicxImageUrlDecoderV2";
import {ImageSizeAdjustParser} from "../../lib/mediastore/ImageSizeAdjustParser";
import {MicxCdnImgElement} from "../../lib/mediastore/MicxCdnImgElement";


const debounceResize = new Debouncer(500, 1000);

export class MicxCdnImageLoader extends LoggingMixin(HTMLElement) {
  static get observedAttributes() {
    return ["default-size-adjust"];
  }

  private _observer?: MutationObserver;
  private _seen = new WeakSet<HTMLImageElement>();

  private _imageDefaultSizeAdjustment = 1;

  private _windowWidth = window.innerWidth;

  private onResize = async ()=> {
    await debounceResize.wait();
    if (this._windowWidth === window.innerWidth) {
      return;
    }
    this._windowWidth = window.innerWidth;
    this.log("Resize event detected, reprocessing images");
    this.querySelectorAll("img").forEach((img) => {
      let src = img.getAttribute("data-src") || img.src || "";
      if ( ! MicxImageUrlDecoderV2.isCdnImage(src)) {
        this.debug("Image is not a CDN image, skipping:", img);
        return; // Not a CDN image
      }
      (new MicxCdnImgElement(img, this._imageDefaultSizeAdjustment, this.getLogger()));
    });
  }


  async connectedCallback() {
    this.log("MicxCdnImageLoader connected to DOM");
    await waitForDomContentLoaded();
    this.updateDefaultSizeAdjustment();

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
        //this.log("MutationObserver detected added node:", rec);
        for (let i = 0; i < rec.addedNodes.length; i++) {
          const node = rec.addedNodes[i];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const el = node as Element;

          const images = Array.from(el.getElementsByTagName("img"));
          if (images.length > 0) {
            images.forEach((img) => this._enqueue(img));
          }



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
    if (this._seen.has(img)) {
      return;
    }
    this._seen.add(img);
    queueMicrotask(()=>this.onImageAdded(img));
  }


  private updateDefaultSizeAdjustment(): void {
    let attrSizeAdjust = this.getAttribute("default-size-adjust");
    if (! attrSizeAdjust) {
      this._imageDefaultSizeAdjustment = 1; // default
      return;
    }

    try {
      this._imageDefaultSizeAdjustment = (new ImageSizeAdjustParser(attrSizeAdjust)).getSizeAdjustment();
    } catch (e) {
      this.error("Failed to parse default-size-adjust=", attrSizeAdjust , e);
      this._imageDefaultSizeAdjustment = 1; // Fallback to default size adjustment
    }

  }


  attributeChangedCallback(name : string, oldValue: any, newVal: any): void {
    // This method is called when properties change,
    // but we don't need to handle any properties for now.
    // If needed, we can implement logic here to handle specific property changes.
    this.debug("Properties changed:", name);
    if (name === "default-size-adjust") {
      this.updateDefaultSizeAdjustment();
    }
  }


  /**
   * Called whenever an <img> element is discovered within this component.
   * Not implemented yet.
   */
   private onImageAdded(image: HTMLImageElement) {
    this.log("onImageAdded image:", image);
    if ( ! MicxImageUrlDecoderV2.isCdnImage(image.src || image.getAttribute("data-src")) || "") {
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

    this.debug("new CDN image:", image, "with default size adjustment:", this._imageDefaultSizeAdjustment);
    new MicxCdnImgElement(image, this._imageDefaultSizeAdjustment, this.getLogger());
  }
}

customElements.define("micx-cdn-image-loader", MicxCdnImageLoader);
