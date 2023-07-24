export class MicxImageUrlEncoderV2 {
    private static readonly RATIO_SHORTCUTS: { [key: string]: string } = {
        "1-1": "a",
        "4-3": "b",
        "3-2": "c",
        "16-9": "d",
        "21-9": "e",
        "3-4": "B",
        "2-3": "C",
        "9-16": "D",
        "9-21": "E"
    };

    private static readonly WIDTH_SHORTCUTS: { [key: string]: string } = {
        "260": "a",
        "414": "b",
        "896": "c",
        "1280": "d",
        "1440": "e",
        "1920": "f",
        "2560": "g",
    };

    private widths: string[];
    private ratio: string;
    private extensions: string[];

    constructor(public id: string, public filename: string) {
        this.widths = [];
        this.extensions = [];
        this.ratio = '';
    }

    setAspectRatio(width: number, height: number): void {
        this.ratio = `${width}-${height}`;
    }

    setReatio(ratio: string): void {
        ratio = ratio.replaceAll("/", "-");
        this.ratio = ratio;
    }

    setWidths(widths: number[]): this {
        console.log("set widths", widths);
        this.widths = widths.map(width => width.toString());
        return this;
    }

    addWidth(width: number): void {
        this.widths.push(width.toString());
    }

    setExtensions(extensions: string[]): this {
        this.extensions = extensions;
        return this;
    }

    toString(): string {
        let widths = this.widths.join("-");
        let extensions = this.extensions.join("_");
        let aspect = this.ratio;

        aspect = aspect.replace(/([0-9\-]+)/, (w) => MicxImageUrlEncoderV2.RATIO_SHORTCUTS[w] ?? w);
        widths = widths.replace(/([0-9]+)/g, (w) => MicxImageUrlEncoderV2.WIDTH_SHORTCUTS[w] ?? w);

        return `v2/${this.id}/${aspect}_${widths}/${this.filename}.${extensions}`;
    }
}
