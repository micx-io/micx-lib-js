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

### Development / Build

Dieses Paket nutzt Vite (Library Mode).

- Dev-Server (served `www/`): `npm run dev`
- Build (ESM + UMD nach `dist/`): `npm run build`
- Preview des Builds: `npm run preview`

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
