import {MicxImageUrlDecoderV2, MicxImageUrlDecoderV2Result} from "./MicxImageUrlDecoderV2";
import {MicxImageUrlEncoderV2} from "./MicxImageUrlEncoderV2";
import {dom_ready, sleep, } from "../helper/functions";
import {waitForDomContentLoaded, Logger, waitForLoad} from "@trunkjs/browser-utils";
import {ImageSizeAdjustParser} from "./ImageSizeAdjustParser";


const loadDirect = 2;



const cdnWeakMap = new WeakMap<HTMLImageElement, MicxCdnImgElement>();

export function micxCdnImgElement(image: HTMLImageElement, logger: Logger): MicxCdnImgElement | null {
  if (cdnWeakMap.has(image)) {
    return cdnWeakMap.get(image) ?? null;
  }

  if (image.src.indexOf("/v2/") === -1)
    return null; // Not a CDN image

  let e = new MicxCdnImgElement(image, parseInt(image.getAttribute("micx_cdn_idx")), logger);
  cdnWeakMap.set(image, e);
  return e;
}


export class MicxCdnImgElement {

  private base: string;
  private path: string;

  private origUri: string;


  private sizeAdjustment: number = 1;
  private debug: boolean = false;

  public constructor(public readonly image: HTMLImageElement, sizeAdjustment: number,  private logger: Logger) {

    let uri = image.src;
    this.origUri = uri;
    uri.replace(/^(.*?\/)(v2\/.*)$/, (p0, base, path) => {
      this.base = base;
      this.path = path;
      return "";
    });
    const sizeAdjustAttr = image.getAttribute("data-size-adjust");
    if (sizeAdjustAttr) {
      try {
        sizeAdjustment = (new ImageSizeAdjustParser(sizeAdjustAttr)).getSizeAdjustment();
      } catch (e) {
        logger.error(`Failed to parse attribute 'data-size-adjust="${sizeAdjustAttr}"' for image`, image, e);
      }
    }
    this.sizeAdjustment = sizeAdjustment;

    let dimensions = MicxImageUrlDecoderV2.decode(this.path);

    this.setOptimalImageDimensions(dimensions);


    // wait for image to be fully loaded




    if (uri.endsWith(".svg")) {
      return; // SVG images come in the right size
    }

    if (this.image.getAttribute("loading") === "eager") {
      // Load eager images directly (LCP)
      this.loadHiRes(dimensions);
      return;
    }

    let listener = async () => {
      await this.image.decode().catch(() => {}); // safe even if already loaded
      this.loadHiRes(dimensions);
    };


    listener();

  }

  public reload() {
    let dimensions = MicxImageUrlDecoderV2.decode(this.path);
    this.loadHiRes(dimensions)
  }

  private async loadHiRes(dimensions: MicxImageUrlDecoderV2Result) {
    await waitForLoad();
    await waitForLoad(this.image);
    await sleep(40); // Settle image size

    if ( ! this.image.isConnected) {
      return; // Image removed from DOM
    }


    // detect actual dimensions of image element (Fallback innerWidth for Safari Garbage)
    let w = this.image.getBoundingClientRect().width;
    if (w === 0 || w === null)
      w = window.innerWidth || document.documentElement.clientWidth;

    // Apply size adjustment
    w = Math.round(w * this.sizeAdjustment);



    // Get best fitting width from dimensions
    let bestWidth = parseInt(dimensions.widths[0]);
    for (let wn of dimensions.widths) {
      let wnI = parseInt(wn);

      if (wnI < w) {
        break;
      }
      bestWidth = wnI;
    }

    this.logger.log("MicxCdnImgElement: Best fitting width for " + dimensions.filename + " is " + bestWidth + "px (innerWidth=" + innerWidth + " px, sizeAdjustment=" + this.sizeAdjustment + ")");


    let e2 = new MicxImageUrlEncoderV2(dimensions.id, dimensions.filename);
    e2.setReatio(dimensions.aspectRatio);
    e2.addWidth(bestWidth);
    e2.setExtensions(dimensions.extensions);
    let url = this.base + "/" + e2.toString();


    this.image.style.backgroundSize = "cover";
    this.image.style.backgroundImage = "url(" + this.origUri + ")";

    this.image.setAttribute("src",  url);

    this.image.addEventListener("load", () => {
      this.image.style.backgroundImage = "none";
      this.image.classList.add("loaded");

    });
  }

  /**
   * Set the Image Dimensions to the optimal (best width) for the current screen size
   *
   * @private
   */
  private setOptimalImageDimensions(dimensions: MicxImageUrlDecoderV2Result) {


    let aspectRatioMultiplier = dimensions.aspectRatio.split("/").map((v) => parseInt(v));
    // Devide first by second
    let aspectRatio = aspectRatioMultiplier[0] / aspectRatioMultiplier[1];

    let w = parseInt(dimensions.widths[0]);
    for (let wn of dimensions.widths) {
      let wnI = parseInt(wn);
      if (wnI < innerWidth) {
        break;
      }
      w = wnI;
    }

    this.image.setAttribute("width", w.toString());
    this.image.setAttribute("height", (w / aspectRatio).toString());

    this.image.classList.add("micx-image-loader");

    if (this.image.hasAttribute("alt") === false)
      this.image.setAttribute("alt", dimensions.filename);
  }

}
