import {MicxFormmailStyleInterface} from "./MicxFormmailStyleInterface";


const invalidFeedbackAttr = "__micxformmail_invalid_feedback";

export class MicxFormmailDefaultBootstrapStyle implements MicxFormmailStyleInterface {
    markInvalid(el: HTMLElement): void {
        el.classList.add("is-invalid");
        if (el.dataset.invalidMsg) {
            let node = document.createElement("div");
            node.classList.add("invalid-feedback");
            node.innerHTML = el.dataset.invalidMsg;
            el.insertAdjacentElement("afterend", node);
            el[invalidFeedbackAttr] = node;
        }
    }

    markValid(el: HTMLElement): void {
        el.classList.add("is-valid");
    }

    setFormInvalid(form: HTMLFormElement): void {
    }

    private bntOrigText: string = "";
    setFormSending(form: HTMLFormElement): void {
        let btn = form.querySelector("input[type='submit'],button[type='submit']");
        let orig = "";
        if (btn instanceof HTMLInputElement) {
            this.bntOrigText = btn.value;
            btn.value = "Sending...";
        } else {
            this.bntOrigText = btn.innerHTML;
            btn.innerHTML = "Sending...";
        }
    }

    setFormSentError(form: HTMLFormElement): void {
        if (this.bntOrigText !== "") {
            let btn = form.querySelector("input[type='submit'],button[type='submit']");
            if (btn instanceof HTMLInputElement) {
                btn.value = this.bntOrigText;
            } else {
                btn.innerHTML = this.bntOrigText;
            }
        }
        alert("[Error] Sending email failed! See browser console for details.");
    }

    setFormSentOk(form: HTMLFormElement): void {
        form.querySelectorAll("input,textarea").forEach(e => e.setAttribute("readonly", "readonly"));

        let node = document.createElement("div");
        let message = form.getAttribute("data-micx-formmail-sent-message") ?? "E-Mail sent successfully!";
        node.innerHTML = `<div class='alert alert-success'>${message}</div>`;

        form.querySelector("input[type='submit'],button[type='submit']").replaceWith(node);

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

        form.querySelectorAll(".is-invalid").forEach((e : any) => {
            if (e[invalidFeedbackAttr] !== undefined) {
                e[invalidFeedbackAttr].remove();
                delete e[invalidFeedbackAttr];
            }
            e.classList.remove("is-invalid")
        });
        form.querySelectorAll(".is-valid").forEach(e => e.classList.remove("is-valid"));
    }

}
