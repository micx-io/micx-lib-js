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

Observe all `<form data-micx-formmail-preset="preset-name">` elements:

```javascript
(new MicxFormmailFacade()).observe();
```

### Api Access

```javascript
var formmail = Micx.formMailApi;
formmail.sendData({
    "key": "value"
}, "preset-name");      
```
