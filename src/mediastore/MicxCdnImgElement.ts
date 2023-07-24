import {MicxImageUrlDecoderV2, MicxImageUrlDecoderV2Result} from "./MicxImageUrlDecoderV2";
import {MicxImageUrlEncoderV2} from "./MicxImageUrlEncoderV2";
import {ka_dom_ready} from "@kasimirjs/embed";


let elementIndex = 0;

export class MicxCdnImgElement {

    private base : string;
    private path : string;


    public constructor(public readonly image : HTMLImageElement) {
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

        if (this.image.complete === true) {
            this.loadHiRes(dimensions);
        }
    }

    private async loadHiRes(dimensions : MicxImageUrlDecoderV2Result) {
        await ka_dom_ready();
        // detect actual dimensions of image element
        let w = this.image.getBoundingClientRect().width;

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

        if (elementIndex++ > 5) {
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
