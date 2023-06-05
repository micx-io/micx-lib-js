import {MicxFormmailStyleInterface} from "./MicxFormmailStyleInterface";


export class MicxFormmailDefaultBootstrapStyle implements MicxFormmailStyleInterface {
    markInvalid(el: HTMLElement): void {
        el.classList.add("is-invalid");
    }

    markValid(el: HTMLElement): void {
        el.classList.add("is-valid");
    }

    setFormInvalid(form: HTMLFormElement): void {
    }

    setFormSending(form: HTMLFormElement): void {
    }

    setFormSentError(form: HTMLFormElement): void {
    }

    setFormSentOk(form: HTMLFormElement): void {
    }

    setFormValid(form: HTMLFormElement): void {
    }

    unmarkInvalid(el: HTMLElement): void {
        el.classList.remove("is-invalid");
    }

    unmarkValid(el: HTMLElement): void {
        el.classList.remove("is-valid");
    }

    resetValidation(form: HTMLFormElement) {
        form.querySelectorAll(".is-invalid").forEach(e => e.classList.remove("is-invalid"));
        form.querySelectorAll(".is-valid").forEach(e => e.classList.remove("is-valid"));
    }

}
