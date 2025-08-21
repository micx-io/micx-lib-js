# micx-lib-js

## General

### Usage

Setting the global Subscription Id:

```javascript
<html>
<head>
    <script>
        window["micx_subscription_id"] = "Subscritpion Id";
    </script>

```


## FormMailer

Send E-Mail from a Website to a E-Mail Address.

### Usage in Html Context

Observe all `<form data-micx-formmail-preset="preset-name" data-micx-formmail-sent-message="E-Mail erfolgreich gesendet!">` elements:

```html
<form data-micx-formmail-preset="preset-name" data-micx-formmail-sent-message="E-Mail erfolgreich gesendet!">
    <input type="text" name="name" placeholder="Name" data-invalidMsg="Bitte gültige E-Mail der Form name@domain.tld eingeben">
</form>
```

```javascript
(new MicxFormmailFacade()).observe();
```

### Api Access

```javascript
var formmail = Micx.formMailApi;
await formmail.sendData({
    "key": "value"
}, "preset-name");      
```

## CDN Image

Load optimally sized images from the MICX CDN by simply pointing your `<img>` tags to a v2-encoded CDN URL. The micx-cdn-image-loader custom element observes images in its subtree, detects CDN URLs, computes the best fitting width for the current element size and screen, and swaps in the high‑resolution image. Non-CDN images are ignored.

Example (HTML):

```html
<micx-cdn-image-loader default-size-adjust=":1.5;1200:1">
  <!-- Detects the v2 URL, pre-renders a preview, then loads the best width -->
    ...
  <img src="https://cdn.leuffen.de/leuffen/v2/abc123/d_gfedcba/hero.jpg_webp" data-size-adjust=":1.25;1600:1">
    ...
</micx-cdn-image-loader>
```

What is does:
- It adds a `loading="lazy"` attribute to all `<img>` elements that match the CDN v2 URL pattern and have no loading attribute.
- It adds a `data-src` attribute to all `<img>` elements that match the CDN v2 URL pattern and not have a data-src attribute.
- It sets the height and width attributes of the `<img>` element to the original image size, if not already set.
- It adds the filename to the alt attribute of the `<img>` element, if not already set.
- It switches the `src` attribute to a high‑resolution image URL based on the current element size and screen size, while keeping the original URL as a background preview.

How it works:
- Detection: The loader watches for `<img>` elements. If the src (or data-src) matches the CDN v2 pattern (e.g. `v2/<id>/<aspect>_<widths>/<filename>.<exts>`), it takes over.
- Preview then swap: It keeps the original URL as a background preview, computes the best width based on the element’s rendered size and a configurable scale, then sets src to the computed high‑res URL. When loaded, the preview is removed and a loaded class is added.
- Sizing logic: The URL encodes an aspect ratio and a set of available widths (often using shortcuts, e.g. d = 16-9, g..a = 2560..260). The loader picks the smallest width that is still >= required pixels.
- Lazy and eager: If loading="eager" is set, the high‑res image is loaded immediately (ideal for LCP). Otherwise it waits for the preview to load first.
- Adjust scale: Use data-size-adjust on an individual image or default-size-adjust on the micx-cdn-image-loader to influence up/down-scaling per screen size. Format: ":<scale>;480:<scale>;1200:<scale>" (example: ":2;480:1.5;1200:1").
- Resize aware: On window resize, the loader re-evaluates and may reload a better fitting size.