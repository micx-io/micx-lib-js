---
slugName: imageurldecoderv2-test-und-iscdnimage
includeFiles:
- ./src/lib/mediastore/MicxImageUrlDecoderV2.ts
- ./src/lib/mediastore/MicxCdnImageObserver.ts
- ./src/lib/mediastore/MicxImageUrlEncoderV2.ts
- ./package.json
editFiles:
- ./src/lib/mediastore/MicxImageUrlDecoderV2.ts
- ./src/lib/mediastore/MicxCdnImageObserver.ts
- ./src/lib/mediastore/MicxImageUrlDecoderV2.test.ts
- ./package.json
original_prompt: erstelle einen ImageUrlDecoderV2 test und eine methode isCdnImage,
  die testet, ob es sich um eine encodede url handelt
---
# Prepare ImageUrlDecoderV2 Test und isCdnImage-Methode

Ziel:
- Tests für MicxImageUrlDecoderV2 implementieren.
- Methode isCdnImage ergänzen, die prüft, ob eine URL eine gültig encodete CDN-v2-Image-URL ist.
- Optional: Observer nutzt die neue Methode anstatt einer einfachen Stringprüfung.

## Assumptions

- isCdnImage soll als statische Methode auf der Klasse MicxImageUrlDecoderV2 implementiert werden: MicxImageUrlDecoderV2.isCdnImage(url: string): boolean.
- isCdnImage soll sowohl relative Pfade (z. B. "v2/...") als auch absolute URLs (z. B. "https://cdn.../v2/...?...") erkennen.
- Der Decoder erwartet weiterhin einen Pfad, der mit "v2/" beginnt (wie aktuell in MicxCdnImgElement genutzt). Wir ändern das Verhalten von decode nicht.
- Wir passen MicxCdnImageObserver an, um die neue Erkennungsmethode zu verwenden.
- Tests werden mit Vitest unter src abgelegt. Wir passen package.json "test"-Script an, damit die Tests einfach ausführbar sind.

Beispiele für verbesserte Prompts:
- "Füge eine statische Methode isCdnImage in MicxImageUrlDecoderV2 hinzu, die absolute und relative URLs erkennt, und aktualisiere MicxCdnImageObserver, diese zu verwenden."
- "Erstelle Vitest-Tests für MicxImageUrlDecoderV2 (Decoder-Logik mit Shortcuts und Direktwerten) und für isCdnImage (true/false Fälle, inkl. Querystrings)."

## Tasks

- iscdnimage-implementieren: Statische Methode isCdnImage(url) in MicxImageUrlDecoderV2 hinzufügen (Regex-basierte Erkennung).
- test-imageurldecoderv2: Vitest-Tests erstellen für Decoder (Shortcuts/Nicht-Shortcuts) und isCdnImage.
- observer-verwenden-iscdnimage: MicxCdnImageObserver auf die neue Methode umstellen.
- packagejson-testscript: Test-Script in package.json auf vitest run setzen.

## Overview: File changes

- ./src/lib/mediastore/MicxImageUrlDecoderV2.ts Statische Methode isCdnImage(url) und internes Regex hinzufügen; optionaler Named-Export (nur statisch genutzt).
- ./src/lib/mediastore/MicxCdnImageObserver.ts Ersetzung der bisherigen "/v2/"-Prüfung durch MicxImageUrlDecoderV2.isCdnImage(image.src).
- ./src/lib/mediastore/MicxImageUrlDecoderV2.test.ts Neue Vitest-Testdatei mit Unit-Tests für decode und isCdnImage.
- ./package.json Test-Skript auf "vitest run" ändern.

## Detail changes

### ./src/lib/mediastore/MicxImageUrlDecoderV2.ts

Referenced Tasks
- iscdnimage-implementieren Statische Methode implementieren
- test-imageurldecoderv2 Schnittstellen unverändert lassen, nur Utility hinzufügen

Insert static members near top of class (after WIDTH_SHORTCUTS):

```ts
export class MicxImageUrlDecoderV2 {
    private static readonly RATIO_SHORTCUTS: { [key: string]: string } = {
        ...original content...
    };

    private static readonly WIDTH_SHORTCUTS: { [key: string]: string } = {
        ...original content...
    };

    // NEW: Robust pattern to detect encoded CDN v2 image URLs (relative or absolute)
    private static readonly CDN_V2_REGEX: RegExp =
        /(?:^|\/)v2\/[^\/]+\/[^\/]+_[^\/]+\/[^\/]+\.[a-z0-9_]+(?:$|[?#])/i;

    /**
     * Prüft, ob die übergebene URL/Pfad eine encodete CDN v2 Image-URL ist.
     * Unterstützt relative Pfade (z. B. "v2/...") und absolute URLs.
     *
     * Gültiges Format:
     *   ".../v2/<id>/<aspect>_<widths>/<filename>.<ext[_ext2[_...]]>"
     *
     * Beispiele:
     *   v2/abc123/d_e-f/hero.jpg_webp
     *   https://cdn.example.com/v2/xyz/16-9_1280-2560/photo.png?ver=1
     */
    public static isCdnImage(url: string): boolean {
        if (typeof url !== 'string' || url.length === 0) return false;
        return MicxImageUrlDecoderV2.CDN_V2_REGEX.test(url);
    }

    constructor(private url: string) {}
    ...original content...
}
```

No other changes to decode().

Optional: No named function export is required since we call the static method on the class elsewhere.

### ./src/lib/mediastore/MicxCdnImageObserver.ts

Referenced Tasks
- observer-verwenden-iscdnimage Nutzung von MicxImageUrlDecoderV2.isCdnImage anstelle von indexOf

Update imports and condition.

Replace

```ts
import {MicxCdnImgElement} from "./MicxCdnImgElement";
import {dom_ready, sleep} from "../helper/functions";
```

by

```ts
import {MicxCdnImgElement} from "./MicxCdnImgElement";
import {dom_ready, sleep} from "../helper/functions";
import { MicxImageUrlDecoderV2 } from "./MicxImageUrlDecoderV2";
```

Replace inside applyToImg:

```ts
        if (image.src.indexOf("/v2/") === -1)
            return; // Not a CDN image
```

by

```ts
        if (!MicxImageUrlDecoderV2.isCdnImage(image.src))
            return; // Not a CDN v2 encoded image
```

No other changes.

### ./src/lib/mediastore/MicxImageUrlDecoderV2.test.ts

Referenced Tasks
- test-imageurldecoderv2 Testfälle für decode (Shortcuts + direkte Werte) und isCdnImage

Create new file with the following content:

```ts
import { describe, it, expect } from 'vitest';
import { MicxImageUrlDecoderV2 } from './MicxImageUrlDecoderV2';

describe('MicxImageUrlDecoderV2.isCdnImage', () => {
  it('returns true for relative v2 URLs', () => {
    const candidates = [
      'v2/abc123/d_e-f/hero.jpg_webp',
      'v2/xyz/16-9_1280-2560/photo.png',
      '/v2/idA/a_b/filename.jpeg',
      '/assets/v2/abc123/d_e/hero.name.jpg_webp',
    ];
    for (const url of candidates) {
      expect(MicxImageUrlDecoderV2.isCdnImage(url)).toBe(true);
    }
  });

  it('returns true for absolute URLs with query/hash', () => {
    const url = 'https://cdn.example.com/images/v2/abc123/d_e-f/hero.jpg_webp?x=1#hash';
    expect(MicxImageUrlDecoderV2.isCdnImage(url)).toBe(true);
  });

  it('returns false for non-v2 or malformed URLs', () => {
    const candidates = [
      '', // empty
      'http://example.com/image.jpg',
      '/images/hero.jpg',
      'v2/abc123/d/hero.jpg',        // missing underscore
      'v2/abc123/d_e-f/herojpg',     // missing dot ext
      'v2//d_e-f/hero.jpg',          // missing id
    ];
    for (const url of candidates) {
      expect(MicxImageUrlDecoderV2.isCdnImage(url)).toBe(false);
    }
  });
});

describe('MicxImageUrlDecoderV2.decode', () => {
  it('decodes with shortcuts (aspect and widths)', () => {
    const url = 'v2/abc123/d_e-f/hero-image.jpg_webp';
    const result = new MicxImageUrlDecoderV2(url).decode();

    expect(result.id).toBe('abc123');
    expect(result.aspectRatio).toBe('16/9'); // 'd' -> 16-9 -> 16/9
    expect(result.widths).toEqual(['1440', '1920']); // e,f -> 1440,1920
    expect(result.filename).toBe('hero-image');
    expect(result.extensions).toEqual(['jpg', 'webp']);
  });

  it('decodes without shortcuts (literal values)', () => {
    const url = 'v2/xyz987/4-3_1024-2048/photo.png';
    const result = new MicxImageUrlDecoderV2(url).decode();

    expect(result.id).toBe('xyz987');
    expect(result.aspectRatio).toBe('4/3');
    expect(result.widths).toEqual(['1024', '2048']);
    expect(result.filename).toBe('photo');
    expect(result.extensions).toEqual(['png']);
  });

  it('throws on invalid format (missing parts)', () => {
    const url = 'v2/abc123/d/photojpg'; // missing underscore in dims and dot in filename
    expect(() => new MicxImageUrlDecoderV2(url).decode()).toThrowError();
  });
});
```

### ./package.json

Referenced Tasks
- packagejson-testscript Script aktualisieren, damit Vitest läuft

Replace the test script:

Replace

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

by

```json
"test": "vitest run"
```

No other changes.

## Missing Information

- Sollen wir decode() robuster machen (z. B. automatisch aus voller URL den Teil ab "v2/" schneiden)? Aktuell lassen wir es wie es ist, da bestehender Code bereits den Pfad extrahiert.
- Soll isCdnImage auch zukünftige Versionen (z. B. v3) erkennen? Aktuell ist es strikt auf v2 ausgelegt.

