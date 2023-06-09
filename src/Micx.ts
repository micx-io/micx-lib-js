import {MicxFormmailerApi} from "./formmail/MicxFormmailerApi";

export class Micx {
    public static endpoint_root_url : string = "https://ws.micx.io";
    public static subscription_id : string = (window as any)["micx_subscription_id"] ?? null as string;

    public static get formMailerApi() {
        return new MicxFormmailerApi(Micx.subscription_id, Micx.endpoint_root_url + "/v1/formmailer/send");
    }

}
