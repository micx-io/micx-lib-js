/**
 * Strict ImageSizeAdjustParser (instance API).
 * Allowed forms:
 *  - "<scale>"                           -> default only
 *  - ":<scale>;(<min>:<scale>)*"         -> default in list + ranges
 *  - "(<min>:<scale>)(;...)*"            -> ranges only (no default)
 * Notes:
 *  - min: non-negative integer
 *  - scale: positive float (e.g. 1.5, 0.4)
 *  - Any other syntax -> throw Error
 *  - No static methods
 */
export interface SizeRule {
  minScreen: number;
  scale: number;
}
export type ImageSizeAdjustmentRules = SizeRule[];

export class ImageSizeAdjustParser {
  public readonly rules: ImageSizeAdjustmentRules;

  constructor(input?: string | null) {
    const text = (input ?? '').trim();
    if (!text) {
      this.rules = [];
      return;
    }

    // Single default scale: "2" or "1.5"
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      const s = parseFloat(text);
      if (!(s > 0)) throw new Error('Scale must be a positive number');
      this.rules = [{ minScreen: 0, scale: s }];
      return;
    }

    const parts = text.split(';').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error('Invalid adjust-sizes input');

    const map = new Map<number, number>();

    for (const p of parts) {
      let m: RegExpMatchArray | null;

      // Default entry: ":2" or ":1.5"
      m = p.match(/^:([0-9]+(?:\.[0-9]+)?)$/);
      if (m) {
        const scale = parseFloat(m[1]);
        if (!(scale > 0)) throw new Error(`Invalid scale in entry "${p}"`);
        map.set(0, scale);
        continue;
      }

      // Range entry: "480:1.5"
      m = p.match(/^([0-9]+):([0-9]+(?:\.[0-9]+)?)$/);
      if (m) {
        const min = parseInt(m[1], 10);
        const scale = parseFloat(m[2]);
        if (!(scale > 0)) throw new Error(`Invalid scale in entry "${p}"`);
        map.set(min, scale);
        continue;
      }

      throw new Error(`Invalid adjust-sizes entry: "${p}"`);
    }

    this.rules = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([minScreen, scale]) => ({ minScreen, scale }));
  }

  /**
   * Returns the scale for the given width.
   * - Picks the rule with the largest minScreen <= width.
   * - If no rules, returns defaultScale (default 1).
   * - If width is omitted or invalid, behaves like "use the last applicable rule".
   */
  public getSizeAdjustment(width: number  = undefined): number {

    if (width === undefined) {
      width = window.innerWidth || document.documentElement.clientWidth || 0;
    }

    let scale = this.rules.length > 0 ? this.rules[this.rules.length - 1].scale : 1;
    for (const r of this.rules) {
      if ( width >= r.minScreen) scale = r.scale;
      else break;
    }
    return scale;
  }
}