import {MicxFormmailerApi} from "./formmail/MicxFormmailerApi";

export class Micx {
    public static endpoint_root_url : string = "https://ws.micx.de";
    public static subscription_id : string = window["micx_subscription_id"] ?? null;

    public static get formMailerApi() {
        return new MicxFormmailerApi(Micx.subscription_id, Micx.endpoint_root_url + "/v1/formmailer/send");
    }

}
