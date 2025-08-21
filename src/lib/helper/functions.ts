export async function dom_ready () : Promise<string> {
    return new Promise<string>((resolve) => {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            return resolve("loaded");
        }


        document.addEventListener("DOMContentLoaded", ()=>{
            resolve('DOMContentLoaded');
        });
    });
}
export async function sleep(sleepms : number) : Promise<void> {
    return new Promise<void>((resolve) => {
        window.setTimeout(() => {
            return resolve();
        }, sleepms);
    });
}
