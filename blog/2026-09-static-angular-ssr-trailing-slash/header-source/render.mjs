// Renders ../header.jpg (2000 x 1050) from header.html.
//
// Usage (needs the `playwright` package, e.g. from any repo that has it installed):
//   node render.mjs
//
// header.html composes:
// - signs-orig.jpg: photo from pxhere, https://pxhere.com/en/photo/593969 (CC0 Public Domain, 5100 x 2898)
// - angular-logo-white.svg: Angular shield from the Angular press kit (CC BY 4.0), fills set to white
// - the sign labels, mapped onto the sign faces with a perspective transform (matrix3d).
//   The corners of each sign face are in the `data-quad` attributes (top-left, top-right,
//   bottom-right, bottom-left, in header pixels). Change the text there, not the corners.
// - a black fade to the right (.fade) behind the logo.
//
// The screenshot is a PNG; convert it to JPEG afterwards, for example on macOS:
//   sips -s format jpeg -s formatOptions 85 header.png --out ../header.jpg

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const here = new URL('.', import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1050 } });
await page.goto(new URL('header.html', here).href);
await page.waitForLoadState('networkidle');
await page.locator('.c').screenshot({ path: fileURLToPath(new URL('header.png', here)) });
await browser.close();
console.log('header.png written, convert it to ../header.jpg');
