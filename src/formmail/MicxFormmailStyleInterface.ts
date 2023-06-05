

export interface MicxFormmailStyleInterface {

    markInvalid(el: HTMLElement): void;
    unmarkInvalid(el: HTMLElement): void;
    markValid(el: HTMLElement): void;
    unmarkValid(el: HTMLElement): void;

    resetValidation(form: HTMLFormElement): void;

    setFormInvalid(form: HTMLFormElement): void;
    setFormValid(form: HTMLFormElement): void;
    setFormSending(form: HTMLFormElement): void;
    setFormSentOk(form: HTMLFormElement): void;
    setFormSentError(form: HTMLFormElement): void;
}
