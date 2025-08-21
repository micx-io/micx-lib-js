export class MicxImageUrlDecoderV2Result {
  id: string;
  aspectRatio: string;
  widths: string[]
  filename: string
  extensions: string[]
}

export class MicxImageUrlDecoderV2 {
    private static readonly RATIO_SHORTCUTS: { [key: string]: string } = {
        "a": "1-1",
        "b": "4-3",
        "c": "3-2",
        "d": "16-9",
        "e": "21-9",
        "B": "3-4",
        "C": "2-3",
        "D": "9-16",
        "E": "9-21"
    };

    private static readonly WIDTH_SHORTCUTS: { [key: string]: string } = {
        "a": "260",
        "b": "414",
        "c": "896",
        "d": "1280",
        "e": "1440",
        "f": "1920",
        "g": "2560",
    };

    // Robust pattern to detect encoded CDN v2 image URLs (relative or absolute)
    private static readonly CDN_V2_REGEX: RegExp =
        /(?:^|\/)v2\/[^\/]+\/[^\/]+_[^\/]+\/[^\/]+\.[a-z0-9_]+(?:$|[?#])/i;

    /**
     * Prüft, ob die übergebene URL/Pfad eine encodete CDN v2 Image-URL ist.
     * Unterstützt relative Pfade (z. B. "v2/...") und absolute URLs.
     *
     * Gültiges Format:
     *   ".../v2/<id>/<aspect>_<widths>/<filename>.<ext[_ext2[_...]]>"
     */
    public static isCdnImage(url: string): boolean {
        if (typeof url !== 'string' || url.length === 0) return false;
        return MicxImageUrlDecoderV2.CDN_V2_REGEX.test(url);
    }


    public static decode(url : string): MicxImageUrlDecoderV2Result {
        const parts = url.split('\/');

        if (parts.length < 4) throw new Error("Invalid url format");

        const id = parts[1];
        let [encodedAspect, encodedWidths] = parts[2].split("_");
        const [filename, extensions] = parts[3].split(".");

        encodedWidths = encodedWidths.replaceAll(/([a-zA-Z])/g, (w) => "-" + (MicxImageUrlDecoderV2.WIDTH_SHORTCUTS[w] ?? w) + "-");
        encodedAspect = encodedAspect.replaceAll(/([a-zA-Z])/g, (w) => MicxImageUrlDecoderV2.RATIO_SHORTCUTS[w] ?? w );

        const aspect = encodedAspect.split('-').join('\/')
        const widths = encodedWidths.split('-').filter(w => w.trim() !== "");

        return {
            id,
            aspectRatio: aspect,
            widths,
            filename,
            extensions: extensions.split("_"),
        };
    }
}