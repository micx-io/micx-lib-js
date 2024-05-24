import {MicxlibRev} from "../index";


export class MicxFormmailerApi {

    constructor(
        public subscription_id : string,
        public endpoint_url : string
    ) {
        console.log('MicxFormmailer constructor');
    }

    async sendData(data : any, preset : string = "default") {
        console.log('MicxFormmailer send data', data);

        data["__sending_hostname"] = window.location.href;
        data["__micxlib_rev"] = MicxlibRev;
        data["__debug_info"] = JSON.stringify({
            userAgent: navigator.userAgent,
            webdriver: navigator.webdriver,
            window_chrome: !!window["chrome"],
        })

        // make all keys of data lowercase and replace - and space by _
        let data2 : any = {};
        for (let key in data) {
            let key2 = key.toLowerCase().replace(/[\s]/g, "_").replace(/-/g, "");
            data2[key2] = data[key];
        }
        data = data2;

        let result = await fetch(this.endpoint_url + `?&subscription_id=${this.subscription_id}&preset=${preset}`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify(data),
            cache: "no-cache"
        });
        if ( ! result.ok) {
            let errorMsg = await result.text();
            console.error(`Formmail Server Error`, errorMsg);
            throw "Cannot send mail: " + errorMsg;
        }
        let successMsg = await result.json();

    }


}
