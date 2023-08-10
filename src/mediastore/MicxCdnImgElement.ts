import {MicxImageUrlDecoderV2, MicxImageUrlDecoderV2Result} from "./MicxImageUrlDecoderV2";
import {MicxImageUrlEncoderV2} from "./MicxImageUrlEncoderV2";
import {dom_ready, sleep} from "../helper/functions";



let elementIndex = 0;

export class MicxCdnImgElement {

    private base : string;
    private path : string;

    private myElementIndex : number;

    private isPreloaded = false;

    public constructor(public readonly image : HTMLImageElement) {
        this.myElementIndex = elementIndex++;

        console.warn("elementIndex", this.myElementIndex, image);

        let uri = image.src;
        uri.replace(/^(.*?\/)(v2\/.*)$/, (p0, base, path) => {
            this.base = base;
            this.path = path;
            return "";
        });
        let dimensions = (new MicxImageUrlDecoderV2(this.path)).decode();

        this.setOptimalImageDimensions(dimensions);


        // wait for image to be fully loaded

        let listener = () => {
            this.image.removeEventListener("load", listener);
            this.loadHiRes(dimensions);
        };
        this.image.addEventListener("load", listener);

        if (this.image.complete === true || this.myElementIndex < 3) {
            this.loadHiRes(dimensions);
        }
    }

    private async loadHiRes(dimensions : MicxImageUrlDecoderV2Result) {
        if (this.myElementIndex < 3) {
            await dom_ready();
            await sleep(200);
        }
        await sleep(10); // Settle image size

        // detect actual dimensions of image element (Fallback innerWidth for Safari Garbage)
        let w = this.image.getBoundingClientRect().width;
        if (w === 0 || w === null)
            w = window.innerWidth;


        // Get best fitting width from dimensions
        let bestWidth = parseInt(dimensions.widths[0]);
        for(let wn of dimensions.widths) {
            let wnI = parseInt(wn);

            if (wnI < w) {
                break;
            }
            bestWidth = wnI;
        }

        let e2 = new MicxImageUrlEncoderV2(dimensions.id, dimensions.filename);
        e2.setReatio(dimensions.aspectRatio);
        e2.addWidth(bestWidth);
        e2.setExtensions(dimensions.extensions);
        let url = this.base + "/" +  e2.toString();


        if (this.myElementIndex < 3 && ! this.isPreloaded) {
            this.isPreloaded = true;
            let preloadLink = document.createElement("link");
            preloadLink.setAttribute("rel", "preload");
            preloadLink.setAttribute("fetchpriority", "high");
            preloadLink.setAttribute("as", "image");
            preloadLink.setAttribute("href", url);
            document.head.append(preloadLink);
        }

        let preload = new Image();
        preload.src = url;

        preload.addEventListener("load", () => {
            this.image.setAttribute("src", url);
            this.image.classList.remove("micx-image-loader");
        });
    }

    /**
     * Set the Image Dimensions to the optimal (best width) for the current screen size
     *
     * @private
     */
    private setOptimalImageDimensions(dimensions : MicxImageUrlDecoderV2Result) {


        let aspectRatioMultiplier = dimensions.aspectRatio.split("/").map((v) => parseInt(v));
        // Devide first by second
        let aspectRatio = aspectRatioMultiplier[0] / aspectRatioMultiplier[1];

        let w = parseInt(dimensions.widths[0]);
        for(let wn of dimensions.widths) {
            let wnI = parseInt(wn);
            if (wnI < window.innerWidth) {
                break;
            }
            w = wnI;
        }

        if (this.myElementIndex > 5) {
            // set lazy loading
            this.image.setAttribute("loading", "lazy");
            this.image.setAttribute("src", this.image.getAttribute("src"));
        }
        this.image.setAttribute("width", w.toString());
        this.image.setAttribute("height", (w / aspectRatio).toString());

        this.image.classList.add("micx-image-loader");

        if (this.image.hasAttribute("alt") === false)
            this.image.setAttribute("alt", dimensions.filename);
    }

}
