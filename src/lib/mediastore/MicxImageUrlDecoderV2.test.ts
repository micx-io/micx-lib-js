import { describe, it, expect } from 'vitest';
import { MicxImageUrlDecoderV2 } from './MicxImageUrlDecoderV2';

describe('MicxImageUrlDecoderV2.isCdnImage', () => {
  it('returns true for valid relative CDN v2 URLs', () => {
    const urls = [
      'v2/abc123/d_gfedcba/hero.jpg_webp',
      '/v2/abc123/a_abc/file.jpg_webp_avif',
      'assets/v2/xyz/e_a-b/hero.png_webp',
    ];

    for (const url of urls) {
      expect(MicxImageUrlDecoderV2.isCdnImage(url)).toBe(true);
    }
  });

  it('returns true for valid absolute CDN v2 URLs (with query and hash)', () => {
    const urls = [
      'https://cdn.example.com/v2/abc123/d_gfed/hero.jpg_webp',
      'https://cdn.example.com/assets/v2/abc123/a_a-b-c/hero.webp_avif?foo=1',
      'https://cdn.example.com/assets/v2/abc123/d_gfedcba/hero.jpg_webp#hash',
      'https://cdn.example.com/path/to/v2/abc123/a_abc/hero.jpg_webp?x=1#y',
    ];

    for (const url of urls) {
      expect(MicxImageUrlDecoderV2.isCdnImage(url)).toBe(true);
    }
  });

  it('returns false for invalid or malformed URLs', () => {
    const urls = [
      '',
      'v3/abc/d_a/hero.jpg_webp',                 // wrong version segment
      'v2/abc/d-a/hero.jpg_webp',                 // missing underscore between aspect and widths
      'v2//d_a/hero.jpg_webp',                    // missing id
      'v2/abc/d_a/hero',                          // missing extensions
      '/images/v2.jpg',                           // not a v2-encoded path
      'https://cdn.example.com/v2/abc/d_a/hero.jpg_webp/extra', // extra path after extension
      'some/other/path',
    ];

    for (const url of urls) {
      expect(MicxImageUrlDecoderV2.isCdnImage(url)).toBe(false);
    }
  });
});

describe('MicxImageUrlDecoderV2.decode', () => {
  it('decodes ratio and width shortcuts correctly', () => {
    const decoder = new MicxImageUrlDecoderV2('v2/abc123/d_gfedcba/hero.jpg_webp_avif');
    const result = decoder.decode();

    expect(result.id).toBe('abc123');
    expect(result.aspectRatio).toBe('16/9'); // 'd' => '16-9' => '16/9'
    expect(result.widths).toEqual(['2560', '1920', '1440', '1280', '896', '414', '260']); // g..a
    expect(result.filename).toBe('hero');
    expect(result.extensions).toEqual(['jpg', 'webp', 'avif']);
  });

  it('decodes numeric aspect and widths without shortcuts', () => {
    const decoder = new MicxImageUrlDecoderV2('v2/xyz/3-2_1280-640-320/sample.png');
    const result = decoder.decode();

    expect(result.id).toBe('xyz');
    expect(result.aspectRatio).toBe('3/2');
    expect(result.widths).toEqual(['1280', '640', '320']);
    expect(result.filename).toBe('sample');
    expect(result.extensions).toEqual(['png']);
  });

  it('throws on invalid format (too few parts)', () => {
    const decoder = new MicxImageUrlDecoderV2('v2/onlytwo/parts');
    expect(() => decoder.decode()).toThrowError(/Invalid url format/i);
  });
})