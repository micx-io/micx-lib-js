
import {MicxFormmailHelper} from "./MicxFormmailHelper";
import {MicxFormmailStyleInterface} from "./MicxFormmailStyleInterface";
import {MicxFormmailDefaultBootstrapStyle} from "./MicxFormmailDefaultBootstrapStyle";
import {MicxFormmailerApi} from "./MicxFormmailerApi";
import {Micx} from "../../Micx";
import {dom_ready} from "../helper/functions";


export class MicxFormmailConfig {
    /**
     * Prevent observed Forms from submitting by pressing Enter
     */
    preventEnterSubmitForm: boolean = true;
}

export class MicxFormmailFacade {

    constructor(
        public formMailer: MicxFormmailerApi = Micx.formMailerApi,
        public config: MicxFormmailConfig = new MicxFormmailConfig(),
        public formatter : MicxFormmailStyleInterface = new MicxFormmailDefaultBootstrapStyle()
    ) {

    }

    protected isMicxFormElement(element: HTMLElement){
        if (element.tagName !== "FORM")
            element = element.closest("form");

        if (element === null) {
            return false;
        }

        if ( ! element.hasAttribute("data-micx-formmail-preset"))
            return false;
        return true;
    }


    /**
     * Observe for submit events from <form data-micx-formmail-preset="default"> forms
     *
     * @param htmlElement
     */
    public async observe(htmlElement: HTMLElement = null) {
        await dom_ready();
        htmlElement = htmlElement || document.body;


        if (this.config.preventEnterSubmitForm) {
            htmlElement.addEventListener("submit", async (e: SubmitEvent) => {
                console.log("submit", e);
                if ( ! this.isMicxFormElement(e.target as HTMLElement))
                    return;
                e.preventDefault();
                e.stopPropagation();
            })
            htmlElement.addEventListener('keydown', async (event : any) => {

                if ( ! this.isMicxFormElement(event.target as HTMLElement)) {
                    return;
                }
                if (event.key === "Enter" && event.target["type"] !== "submit" && event.target["type"] !== "textarea" && event.target["type"] !== "button" && event.target.tagName !== "NXA-FORM-TEXTAREA") {
                    event.preventDefault();
                }
            });
        }


        htmlElement.addEventListener("click", (e : MouseEvent | any) => {
            let target = e.target as HTMLElement;
            if ( ! this.isMicxFormElement(target))
                return;

            let button = target.closest("button[type='submit'],input[type='submit']");
            if (button === null)
                return;

            let form = target.closest("form");
            e.preventDefault();
            e.stopPropagation();
            this.processForm(form);
        });
    }


    private async processForm(form: HTMLFormElement) {
        let formCollectedData = MicxFormmailHelper.collectFormData(form);

        this.formatter.resetValidation(form);
        if (formCollectedData.invalidForms.length > 0) {
            for (let el of formCollectedData.invalidForms) {
                this.formatter.markInvalid(el);
            }
            this.formatter.setFormInvalid(form);
            form.dispatchEvent(new Event("invalid", {}));
            return;
        }


        let submitButton = form.querySelector("[type='submit']");
        submitButton.setAttribute("disabled", "disabled");
        this.formatter.setFormSending(form);

        try {
            let response = await this.formMailer.sendData(
                formCollectedData.formdata,
                form.getAttribute("data-micx-formmail-preset") ?? "default"
            );
            submitButton.removeAttribute("disabled");
            this.formatter.setFormSentOk(form);
        } catch (e) {
            submitButton.removeAttribute("disabled");
            this.formatter.setFormSentError(form);
        }
    }

}
