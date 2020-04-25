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
	<img width="50%" src="https://github.com/gripeless/pico/blob/master/media/wikipedia-pico.png?raw=true">
	<img width="49%" src="https://github.com/gripeless/pico/blob/master/media/wikipedia-real.png?raw=true">
</div>

<div>
	<img width="50%" src="https://github.com/gripeless/pico/blob/master/media/firebase-pico.png?raw=true">
	<img width="49%" src="https://github.com/gripeless/pico/blob/master/media/firebase-real.png?raw=true">
</div>

<div>
	<img width="50%" src="https://github.com/gripeless/pico/blob/master/media/gripeless-pico.png?raw=true">
	<img width="49%" src="https://github.com/gripeless/pico/blob/master/media/gripeless-real.png?raw=true">
</div>

<div align="center"><sub>(PNG output on the left · Original page on the right)</sub></div>

<br>

---

<div align="center">


<sup>Development of this library is possible thanks to:</sup>
<br>
<br>
<a href="https://usegripeless.com">
<img src="https://github.com/gripeless/pico/blob/master/media/gripeless.svg" height="45px" alt="Gripeless">
</a>
<br>
<sub><b>Gripeless is a free complaint solution for web apps</b></sub>
<br>
<sub>Let your users take screenshots of important issues, pipe them into your issue tracker<br> and let your users know when they're fixed, automatically.</sub>
<br>
<br>
<sub>
<a href="https://usegripeless.com">https://usegripeless.com</a>
</sub>

</div>

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

# Testing

There are two ways to test Pico's output, one being the provided visual
testing suite and two a web extension that you can test Pico on any real
world website (as long as it doesn't block `eval` (which is most of them so
it's not much of an issue)).

## Development server

To run any of the tests you need to use the development server:

```bash
$ npm run dev
```

Main bundle will be served at `http://localhost:23231/index.js` and
automatically updated whether you change any of the source code.

## Web extension

> Run Pico on any website of your choice.

1. Ensure that you have the development server running

2. Open the web extension (located in `web-ext/` in the root of this
   repository) in the browser of your choice - note that it has only been
   tested with Firefox, so YMMV. If you have Firefox Nightly installed, for
   convenience run `npm run dev:ext` to open the web extension in that
   browser - you will have the development browser separate and clean from
   your day to day one.

3. With the opened browser, browse onto a website you want to test.
   You should see a browser action in your address bar:

   ![Browser action in address bar](https://github.com/gripeless/pico/blob/master/media/browser-action-address-bar.png?raw=true)

   Click on the green puzzle icon to take a screenshot, a new tab should
   open with the output contents in SVG form.

## Testing REPL

> Separate cases to test out individual parts of the renderer.

The test suite spawns a real browser (via
[Playwright](https://github.com/microsoft/playwright)) and lets you compare
the output screenshot from Pico to the "real" viewport.

It is designed with really quick iteration in mind and to allow you to
scaffold out potential problems with the library quickly, whether it's
rendering related, CORS related, or anything browser specific related.

The suite is currently only provided in an interactive form, which means
that you have to use your eyes to judge whether the result is suiting or
not.

### Running the REPL

1. Ensure that you have the development server running

2. Add the following to your hosts file:

	```
	127.0.0.1 test.localhost
	127.0.0.1 test2.localhost
	127.0.0.1 test3.localhost
	127.0.0.1 test4.localhost
	127.0.0.1 test5.localhost
	```

	This lets you test cross-origin related issues without having to do any
	complicated local DNS setup.

3. Start the interactive test REPL:

```bash
$ npm run test:interactive
```

An empty browser window should open (in the background if you're on macOS),
this will show the output of any test you run through the console.

### REPL Commands

#### `open`
Opens the browser output again, useful if you happened to close the original output.

#### `run (case name)`
Runs a test with the specified name.

#### `watch (case name)`
Same as `run`, but will update if either the `source/` directory updates or the case.

Press <kbd>q</kbd> to exit the watcher.

#### `all`
Runs all available tests.

### Adding a new test case

The easiest way to add a new case is to start with an existing one and
modify it to suit your needs. For most cases you won't need any special
browser flags or extra servers - I usually just copy `test/cases/hello` into
a new directory in `test/cases`.

1. Create the test's directory in `test/cases`.
For consistency, the name of the test case should be kebab-case.

2. Add your test to `test/cases/index.ts`

After that's done restart your test REPL and you'll be able to run your test
case.


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

MIT (c) 2020 Primitive Software

https://usegripeless.com
