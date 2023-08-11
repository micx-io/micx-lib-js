import {MicxCdnImgElement} from "./MicxCdnImgElement";
import {dom_ready, sleep} from "../helper/functions";


let cdnIdx = 0;
export class MicxCdnImageObserver {


    private applyToImg(image : HTMLImageElement) {
        if ((image as any)["micx_cdn_observer"] === true)
            return;
        (image as any)["micx_cdn_observer"] = true;

        if (image.src.indexOf("/v2/") === -1)
            return; // Not a CDN image
        if ( ! image.hasAttribute("micx_cdn_idx"))
            image.setAttribute("micx_cdn_idx", "" + cdnIdx++);

        let e = new MicxCdnImgElement(image, parseInt(image.getAttribute("micx_cdn_idx")));
    }


    public async observe() {
        let round = 1;
        while(true) {
            await sleep(20 * round++);
            document.querySelectorAll("img").forEach(img => {
                this.applyToImg(img);
            });

            if (round > 50)
                round = 50;
        }
    }

}
