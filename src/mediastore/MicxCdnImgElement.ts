import {MicxImageUrlDecoderV2, MicxImageUrlDecoderV2Result} from "./MicxImageUrlDecoderV2";
import {MicxImageUrlEncoderV2} from "./MicxImageUrlEncoderV2";
import {dom_ready, sleep} from "../helper/functions";
import {hitIndex} from "../hit-index";


 const loadDirect = 2;

 const innerWidth = window.innerWidth;

export class MicxCdnImgElement {

    private base : string;
    private path : string;

    private origUri : string;
    private myElementIndex : number;

    private isPreloaded = false;

    public constructor(public readonly image : HTMLImageElement, index : number) {
        this.myElementIndex = index;

        let uri = image.src;
        this.origUri = uri;
        uri.replace(/^(.*?\/)(v2\/.*)$/, (p0, base, path) => {
            this.base = base;
            this.path = path;
            return "";
        });
        let dimensions = (new MicxImageUrlDecoderV2(this.path)).decode();

        this.setOptimalImageDimensions(dimensions);


        // wait for image to be fully loaded



        image.classList.add("micx-image-loader");


        if (index === 1) {
            // Load first image directly (LCP)
            this.loadHiRes(dimensions);
            return;
        }

        let listener = async () => {
            await dom_ready();
            if (hitIndex === 1)
                await sleep(2500);
            this.image.removeEventListener("load", listener);
            this.loadHiRes(dimensions);
        };

        this.image.addEventListener("load", listener);

        if (this.image.complete === true || this.myElementIndex < loadDirect) {
            this.loadHiRes(dimensions);
        }
    }

    private async loadHiRes(dimensions : MicxImageUrlDecoderV2Result) {
        await dom_ready();

        await sleep(40); // Settle image size

        // detect actual dimensions of image element (Fallback innerWidth for Safari Garbage)
        let w = this.image.getBoundingClientRect().width;
        if (w === 0 || w === null)
            w = innerWidth;


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



        this.image.style.backgroundSize = "cover";
        this.image.style.backgroundImage = "url(" + this.origUri + ")";
        this.image.setAttribute("src", url);

        this.image.addEventListener("load", () => {
            this.image.classList.add("loaded");

        });
        /*
        let preload = new Image();
        preload.src = url;

        preload.addEventListener("load", () => {

        });

         */
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
            if (wnI < innerWidth) {
                break;
            }
            w = wnI;
        }

        console.log("found inner width: " + w + " for " + dimensions.widths.join(", ") + " and " + innerWidth);

        if (this.myElementIndex >= loadDirect) {
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
