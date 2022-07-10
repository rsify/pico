<div align="center">
<br>
<img height="200px" src="https://github.com/gripeless/pico/blob/master/media/pico-shadow.png?raw=true">
<h3>📸 Pico</h3>
<p>Take browser screenshots in Javascript</p>
<img src="https://img.shields.io/npm/v/@gripeless/pico" alt="npm">
<img src="https://img.shields.io/github/issues/gripeless/pico" alt="GitHub issues">
<img src="https://img.shields.io/bundlephobia/minzip/@gripeless/pico?label=compressed" alt="Compressed size">

</div>


<br>

<div>
	<img width="49%" src="https://github.com/gripeless/pico/blob/master/media/wikipedia-real.png?raw=true">
	<img width="50%" src="https://github.com/gripeless/pico/blob/master/media/wikipedia-pico.png?raw=true">
</div>

<div>
	<img width="49%" src="https://github.com/gripeless/pico/blob/master/media/firebase-real.png?raw=true">
	<img width="50%" src="https://github.com/gripeless/pico/blob/master/media/firebase-pico.png?raw=true">
</div>

<div>
	<img width="49%" src="https://github.com/gripeless/pico/blob/master/media/gripeless-real.png?raw=true">
	<img width="50%" src="https://github.com/gripeless/pico/blob/master/media/gripeless-pico.png?raw=true">
</div>

<div align="center"><sub>(Original page on the left · PNG output on the right)</sub></div>

<br>

---


# Goal

Pico's goal is to produce high precision screenshots of any viewport entirely
client side. This is different from simply capturing a webpage using
[Puppeteer](https://github.com/puppeteer/puppeteer) or a similar tool in that
**the screenshot taking happens entirely client side**.

The viewport screenshots include scrolled element scroll states, cross-origin
images, input states, web fonts, canvas contents, current video frame contents,
and much more information that you wouldn't be able to get using something like
a headless browser.

At the time of writing there are no existing solutions that are aimed
of reproducing the entire viewport accurately like Pico.


# How it works

> Warning: nerdy

This program renders whatever is displayed in the given `Window` into an
image, thanks to svg's `<foreignObject>`.

**No server side code is required** to produce the screenshot.

There is no native Javascript API to take the screenshot of what the user is
currently seeing on their screen (and because of security issues there
probably will never be one).

Since we don't have access to the raw data that's being shown to the user we
have to reconstruct it manually. This program works thanks to svg's
`<foreignObject>` which lets you insert any valid HTML content inside, which
we can then pass as a data URL into a `<canvas>`' `drawImage` and read out
the raw image data with `canvas.toBlob` or `canvas.toDataURL`.

The above alone would work great in a universe where subresources didn't
exist - which as you know is not our universe. SVG's inserted into `<img>`
tags (or in our case, `<canvas>`') cannot display any external resources,
whether it's images, fonts or stylesheets.

To work around that fact Pico does the following things:
- Downloads and inlines contents of all `<img>` tags as data URL's in their `src`
  attributes
- Downloads external stylesheets and inlines them as `<style>` tags
- Checks all stylesheets for nested resources
	- Downloads and checks nested stylesheets in `@import` rules
	- Downloads any resources referenced by the `url()` function, including
	  but not exclusive to the following properties:
		- `background`s
		- `background-image`s
		- `src` in `@font-face` rule
		- `cursor`
		- `content`

In addition, Pico also:
- Copies input states (text inputs, checkboxes, textareas) into `value`
  attributes so that they can be shown in SVG
- Emulates current scroll positions on all scrolled elements (including the
  root `<html>` element) via either `transform: translate` (for root node)
  and `absolute` positioning of children of scrolled nodes
- Transforms existing `<canvas>` elements into `<img>` tags with the contents of the `<canvas>`' inlined as data URL's in `src`
- Performs various minor fixes for `rem` font size, working media queries,
  preserving size of everything, etc.

The returned DOM is inserted into an `<iframe>`, serialized into XML,
converted into a data URL, put into an `Image`, which is then rendered onto
a `<canvas>` whose contents are read out with `canvas.toBlob` and finally
returned to the program's caller, together with all the errors when
resources failed to load.

Pico is able to safely accumulate all async resource errors thanks to
[Fluture](https://github.com/fluture-js/Fluture), which is a really great
alternative to the native `Promise` and forces you to write type safe
errors. You can read a [fantastic introductory article to it by the
library's author here](https://dev.to/avaq/fluture-a-functional-alternative-to-promises-21b).


# API

Pico is built using [Fluture](https://github.com/fluture-js/Fluture) and in
addition to the `Promise` also provides a direct API to `Fluture` via functions
suffixed with `Fluture`. If you don't care about functional programming just
use the non-suffixed functions to work with `Promise`'s instead.

All functions return an "`ErrorStack`", which is basically just the returned
value paired with any errors that happened while computing it. Most errors will
be CORS or 404 related issues when loading subresources.

## Types

```typescript
declare type ErrorStack<T> = {
    errors: DetailedError[];
    value: T;
};
```

```typescript
export declare type DetailedError = {
    // Human readable string of why the error happened
    reason: string;

    // Proper error object
    error: Error;
};
```

```typescript
export declare type Options = {
    // An array of selectors to nodes that should not be included in the output.
    ignore: string[];
};
```

## Functions

```typescript
declare const objectURL: ($window: Window, partialOptions?: Partial<Options>) => Promise<ErrorStack<string>>;
declare const objectURLFluture: ($window: Window, options: Options) => Fluture<DetailedError, ErrorStack<string>>;
```
Render the given `Window` to a PNG image and return it as an
[object URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL).
This is safer to use than `dataURL` due to memory constraints. Remember to call
[`URL.revokeObjectURL`](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)
when you're done with the image.

---

```typescript
declare const dataURL: ($window: Window, partialOptions?: Partial<Options>) => Promise<ErrorStack<string>>;
declare const dataURLFluture: ($window: Window, options: Options) => Fluture<DetailedError, ErrorStack<string>>;
```
Render the given `Window` to a PNG image and return it as a
[data url](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs).
Note that
[in Chrome the limit for data url's is 2MB](https://stackoverflow.com/a/41755526),
prefer `objectURL` when possible.

---

```typescript
declare const svgObjectURL: ($window: Window, partialOptions?: Partial<Options>) => Promise<ErrorStack<string>>;
declare const svgObjectURLFluture: ($window: Window, options: Options) => Fluture<DetailedError, ErrorStack<string>>;
```

Render the given `Window` to an SVG image and return it as an
[object URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL).
This function is mainly useful for inspecting the output of Pico using
devtools, for real uses prefer the other functions.

# Installation

```bash
$ npm install @gripeless/pico
```

The module is intended to be used exclusively in the browser via a code bundler
like Rollup or Webpack. There is no single file bundle build provided at this
time.


# Contributing

See [contributing.md](contributing.md).


# Caveats

Pico is being developed against recent Firefox and Blink based browsers
(Chrome, Opera, Brave, Edge). It does not work on Safari or old Edge versions
due to lack of proper support for `<foreignObject>`.


# Prior art

Pico's code was inspired in many ways by the following libraries:

- [dom-to-image](https://github.com/tsayen/dom-to-image) (and its sisters [dom-to-image-more](https://github.com/1904labs/dom-to-image-more) and [html-to-image](https://github.com/bubkoo/html-to-image#readme))
- [rasterizeHTML.js](https://github.com/cburgmer/rasterizeHTML.js)
- [html2canvas](https://github.com/niklasvh/html2canvas)

Pico's selling point is representing the whole viewport
as accurately as possible. If you want to render a single DOM node instead,
consider using one of the above libraries.

To the authors of the above code, thank you for your awesome work.

# License

MIT
