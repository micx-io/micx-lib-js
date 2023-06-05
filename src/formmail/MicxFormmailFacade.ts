
import {MicxFormmailHelper} from "./MicxFormmailHelper";
import {MicxFormmailStyleInterface} from "./MicxFormmailStyleInterface";
import {MicxFormmailDefaultBootstrapStyle} from "./MicxFormmailDefaultBootstrapStyle";
import {MicxFormmailerApi} from "./MicxFormmailerApi";


export class MicxFormmailConfig {
    /**
     * Prevent observed Forms from submitting by pressing Enter
     */
    preventEnterSubmitForm: boolean = true;
}

export class MicxFormmailFacade {

    constructor(
        public formMailer: MicxFormmailerApi,
        public config: MicxFormmailConfig = new MicxFormmailConfig(),
        public formatter : MicxFormmailStyleInterface = new MicxFormmailDefaultBootstrapStyle()
    ) {

    }

    /**
     * Observe for submit events from <form data-micx-formmail-preset="default"> forms
     *
     * @param htmlElement
     */
    public async observe(htmlElement: HTMLElement = null) {

        htmlElement = htmlElement || document.body;

        if (this.config.preventEnterSubmitForm) {
            htmlElement.addEventListener("submit", async (e: SubmitEvent) => {
                let form = (e.target as HTMLFormElement).closest("form") as HTMLFormElement;
                if (form === null)
                    return;
                if (!form.hasAttribute("data-micx-formmail-preset"))
                    return;
                e.preventDefault();
                e.stopPropagation();
            })
        }

        htmlElement.addEventListener("click", (e : MouseEvent | any) => {
            let target = e.target as HTMLElement;
            if (target.closest("button") === null || target.closest("button").getAttribute("type") !== "submit") {
                return;
            }
            let form = (e["explicitOriginalTarget"] || e.target).closest("form");
            if (form === null)
                return;
            if (e["pointerType"] === '' && this.config.preventEnterSubmitForm) {
                return; // Triggered by Enter in Input Form
            }
            if (!form.hasAttribute("data-micx-formmail-preset"))
                return;
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
            let response = this.formMailer.sendData(
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
