import {MicxCdnImgElement} from "./MicxCdnImgElement";
import {dom_ready, sleep} from "../helper/functions";
import {MicxImageUrlDecoderV2} from "./MicxImageUrlDecoderV2";


let cdnIdx = 0;
export class MicxCdnImageObserver {


    private applyToImg(image : HTMLImageElement) {
        if ((image as any)["micx_cdn_observer"] === true)
            return;
        (image as any)["micx_cdn_observer"] = true;

        if (!MicxImageUrlDecoderV2.isCdnImage(image.src))
            return; // Not a CDN v2 encoded image
        if ( ! image.hasAttribute("micx_cdn_idx"))
            image.setAttribute("micx_cdn_idx", "" + cdnIdx++);

        let e = new MicxCdnImgElement(image, parseInt(image.getAttribute("micx_cdn_idx")));
    }


    public async observe() {
        let round = 1;
        while(true) {
            await sleep(25 * round++);
            document.querySelectorAll("img").forEach(img => {
                this.applyToImg(img);
            });

            if (round > 50)
                round = 50;
        }
    }

}