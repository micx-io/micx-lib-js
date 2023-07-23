import {MicxCdnImgElement} from "./MicxCdnImgElement";


export class MicxCdnImageObserver {


    private applyToImg(image : HTMLImageElement) {
        if ((image as any)["micx_cdn_observer"] === true)
            return;
        (image as any)["micx_cdn_observer"] = true;

        console.log("Apply");
        if (image.src.indexOf("/v2/") === -1)
            return; // Not a CDN image

        let e = new MicxCdnImgElement(image);
    }


    public observe(element : HTMLElement = null) {
        if (element === null)
            element = document.body;

        window.setInterval(() => {
            document.querySelectorAll("img").forEach(img => {
                this.applyToImg(img);
            })
        }, 100);
    }

}
