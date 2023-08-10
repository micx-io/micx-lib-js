import {MicxCdnImgElement} from "./MicxCdnImgElement";
import {sleep} from "../helper/functions";



export class MicxCdnImageObserver {


    private applyToImg(image : HTMLImageElement) {
        if ((image as any)["micx_cdn_observer"] === true)
            return;
        (image as any)["micx_cdn_observer"] = true;

        if (image.src.indexOf("/v2/") === -1)
            return; // Not a CDN image

        let e = new MicxCdnImgElement(image);
    }


    public async observe() {
        let round = 1;
        while(true) {
            document.querySelectorAll("img").forEach(img => {
                this.applyToImg(img);
            });
            await sleep(10 * round++);
            if (round > 50)
                round = 50;
        }
    }

}
