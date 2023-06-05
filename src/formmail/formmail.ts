

export class MicxFormmailer {

    constructor(
        public subscription_id : string,
        public endpoint_url : string
    ) {
        console.log('MicxFormmailer constructor');
    }

    sendData(data : any, preset : string = "default") {
        console.log('MicxFormmailer send');
    }


}
