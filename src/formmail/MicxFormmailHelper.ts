
export type FormCollectedData = {
    formdata: any,
    invalidForms: any[]
}

export class MicxFormmailHelper {

    public static collectFormData(form: HTMLFormElement): FormCollectedData {
        let invalidForms = [];
        let formdata = {};
        let unnamedFieldIndex = 0;
        for (let el of form.querySelectorAll("input,select,textarea") as HTMLInputElement[] | HTMLSelectElement[] | HTMLTextAreaElement[]) {
            let valid = el.validity.valid;
            if (el.type.toLowerCase() === "email") {
                el.value = el.value.trim(); // Trim EMail
                if ( ! el.value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/) === null)
                    valid = false;
            }

            if (valid === false)
                invalidForms.push(el);

            if (el.name === "" && el.id === "") {
                if (el.type !== "submit")
                    console.warn("[Warning] Skipping Form-Element without id or name attribute", el);
                continue;
            }
            let name = el.name;
            if (name === "")
                name = el.id;
            if (name === "")
                name = el.getAttribute("label") ?? "unnamed_" + unnamedFieldIndex++;

            name = name.trim();

            if (el.type === "checkbox" && el.checked === false)
                continue;
            if (name.endsWith("[]")) {
                name = name.slice(0, -2);
                if (!Array.isArray(formdata[name]))
                    formdata[name] = [];
                formdata[name].push(el.value);
            } else {
                formdata[name] = el.value;
            }
        }
        return {formdata, invalidForms};
    }

}
