
export type FormCollectedData = {
    formdata: any,
    invalidForms: any[]
}

export class MicxFormmailHelper {

    public static collectFormData(form: HTMLFormElement): FormCollectedData {
        let invalidForms = [];
        let formdata : any = {};
        let unnamedFieldIndex = 0;
        for (let el of form.querySelectorAll("input,select,textarea") as any) {
            let valid = el.validity.valid;
            if (el.type.toLowerCase() === "email" && el.value.trim() !== "") {
                el.value = el.value.trim(); // Trim EMail
                valid = el.validity.valid;
                if (el.value.match(/^[\p{L}\d._%+-]+@[\p{L}\d.-]+.[\p{L}]{2,}$/u) === null)
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

            let value = el.value;

            if (el.type === "checkbox" && el["checked"] === false)
                continue;
            if (el.type === "date") {
                if (value !== "")
                    value = new Date(value).toLocaleDateString('de-DE');
            }
            if (name.endsWith("[]")) {
                name = name.slice(0, -2);
                if (!Array.isArray(formdata[name]))
                    formdata[name] = [];
                formdata[name].push(value);
            } else {
                formdata[name] = value;
            }
        }
        return {formdata, invalidForms};
    }

}
