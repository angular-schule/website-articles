---
title: "Static Angular SSR: Nice URLs and good SEO - you can't have both (but here's a fix!)"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
bio: '<a href="https://angular-buch.com"><img src="https://angular-buch.com/assets/img/book-cover-v1m.png" alt="Angular-Buch Cover" style="float: right; margin-top: -60px; margin-right: 30px; max-width: 250px;"></a>Johannes Hoppe is a trainer, consultant and developer specializing in Angular. He is a co-author of the <b>Angular book</b> (in German language), together with Ferdinand Malcher and Danny Koppenhagen. After four successful editions, they have rewritten the book from scratch – with modern syntax, compact and covering many new topics. The new book is out now. More info at <a href="https://angular-buch.com" style="text-decoration: underline;"><b>angular-buch.com</b></a>'
bioHeading: About Johannes Hoppe
author2: Angular.Schule Team
mail2: team@angular.schule
bio2: '<a href="https://angular.schule"><img src="/img/logo-angular-schule-gradient-550.png" alt="Angular.Schule Logo" style="float: right; margin-left: 30px; margin-top: -10px; margin-right: 30px; max-width: 250px;"></a>Want to write clean, well-structured code with best practices in mind? Join Ferdinand Malcher and Johannes Hoppe in our workshops, where you learn Angular the practical way – including modern tools for more efficient development. More at <a href="https://angular.schule" style="text-decoration: underline;"><b>angular.schule</b></a>'
bio2Heading: About our Angular workshops
published: 2026-09-25
keywords:
  - Angular
  - Angular 22
  - SSR
  - SSG
  - Prerendering
  - Static Site Generation
  - outputMode static
  - Trailing Slash
  - Redirect
  - SEO
  - GitHub Pages
  - Cloudflare Pages
  - Astro build.format
  - prerenderFormat
  - TrailingSlashPathLocationStrategy
language: en
header: header.jpg
---

I love Angular.
But when it comes to prerendered static sites, Angular falls behind other major frameworks.
Astro, Next.js, SvelteKit: they all let you choose how your pages are written to disk.
Angular doesn't.

And static sites are great: hosting is literally free, and a CDN serves your pages to the whole world and scales like a beast.
That's why the websites of Angular.Schule and the Angular book are prerendered static sites.

Prerender your app, deploy it to a static host (for example GitHub Pages, Cloudflare Pages or Firebase Hosting), and take a look at the network tab: every direct visit starts with a redirect to the same URL with a trailing slash, and a moment later the Angular router quietly removes the slash again.
You can get rid of the redirect, but only by putting a trailing slash on every URL of your site.
**Nice URLs or good SEO: with Angular's prerendering, you can't have both. In this article, I explain why, and how to get both today.**

## Contents

[[toc]]

## Today: nice URLs or good SEO, you can't have both

Angular's prerendering (SSG) writes every route into its own folder.
Take the article you are reading right now: with Angular's default, the route `blog/2026-09-static-angular-ssr-trailing-slash` becomes `blog/2026-09-static-angular-ssr-trailing-slash/index.html`.
For the rest of this article, let's call it `blog/my-article`.

A static host like GitHub Pages or Cloudflare Pages sees a request for `/blog/my-article`, finds a folder with that name and redirects to `/blog/my-article/`.

```bash
$ curl -I https://example.com/blog/my-article
HTTP/2 301
location: https://example.com/blog/my-article/
```

The browser follows the redirect, gets the `index.html`, Angular starts, and the router normalizes the URL back to `/blog/my-article`.
So you have to choose:

- **Nice URLs, but redirects:** Your links use `/blog/my-article`. Every direct visit (a search engine, a bookmark, a link shared on social media) starts with a redirect to `/blog/my-article/`, and the Angular router then removes the trailing slash again. The URL in your links is never the URL that actually answers.
- **No redirects, but trailing slashes everywhere:** Your links have to use `/blog/my-article/`. Pages answer directly, but every URL ends with a slash, and Angular needs an extra provider to keep it in the address bar: `{ provide: LocationStrategy, useClass: TrailingSlashPathLocationStrategy }` (see [`TrailingSlashPathLocationStrategy`](https://angular.dev/api/common/TrailingSlashPathLocationStrategy)).

## Why does Angular do this?

The file name is decided in exactly one place in the Angular CLI, the function `getRouteOutPath()` in `@angular/build`:

```typescript
function getRouteOutPath(route: string, baseHrefPathname: string): string {
  const routeWithoutBaseHref = getRouteWithoutBaseHref(route, baseHrefPathname);

  return stripLeadingSlash(posix.join(routeWithoutBaseHref, 'index.html'));
}
```

Every route ends up as `<route>/index.html`.
There is no option to change that.
This layout works on every web server, which makes it a good default.
But many static hosts can do better: they serve `blog/my-article.html` under `/blog/my-article`, directly, without a redirect.
Angular just never writes `blog/my-article.html`.

## How do other frameworks handle this?

Static site generators have offered this choice for a long time.
Angular is the odd one out:

| Framework | Option | `blog/my-article/index.html` | `blog/my-article.html` |
|---|---|---|---|
| **Astro** | `build.format` | `'directory'` (default) | `'file'` |
| Next.js (static export) | `trailingSlash` | `true` | `false` (default) |
| SvelteKit | `trailingSlash` | `'always'` | `'never'` (default) |
| Nuxt 2 | `generate.subFolders` | `true` (default) | `false` |
| Hugo | `uglyURLs` | `false` (default) | `true` |
| **Angular** | – | always | – |

Next.js and SvelteKit even write `blog/my-article.html` by default.
And the [Astro documentation](https://docs.astro.build/en/reference/configuration-reference/#buildformat) recommends `build.format: 'file'` together with `trailingSlash: 'never'`, which is the combination Angular can't produce today.

## With `@angular-schule/prerender-format`: nice URLs and good SEO, we deserve both!

The fix is surprisingly small: write `blog/my-article.html` instead of `blog/my-article/index.html`.

Until Angular can do this on its own, the builder [`@angular-schule/prerender-format`](https://www.npmjs.com/package/@angular-schule/prerender-format) can do the job for us.

![Sequence diagram between browser and static host. Today: 1. GET /blog/my-article, the host answers 301 with Location /blog/my-article/. 2. GET /blog/my-article/, the host answers 200 with blog/my-article/index.html. 3. In the browser, the Angular router changes the address bar back to /blog/my-article. With blog/my-article.html: GET /blog/my-article, the host answers 200 with blog/my-article.html, done.](diagram-requests.svg "Today, every direct visit needs two requests, and the Angular router hides the trailing slash afterwards. With blog/my-article.html, one request is enough.")

In fact, you are looking at it right now.
The Angular.Schule website is built with it, and this article is served from `blog/2026-09-static-angular-ssr-trailing-slash.html`.
Open the network tab and reload: no redirect, just a clean URL.

- **Nice URLs:** `/blog/my-article`, without a trailing slash, in your links, in the address bar and in the server response alike.
- **Good SEO:** every page answers directly. Search engines see no redirect, and the URL they crawl is the same one your links point to.

And yes, `blog.html` and the folder `blog/` can live side by side: the host serves `/blog` from the file and `/blog/my-article` from the folder.

### Installation

```bash
ng add @angular-schule/prerender-format
ng build
```

`ng add` swaps the builder of your build target and sets the new option `prerenderFormat`:

```json
"build": {
  "builder": "@angular-schule/prerender-format:application",
  "options": {
    "outputMode": "static",
    "prerenderFormat": "file"
  }
}
```

- `"directory"` (default): `/blog/my-article` is written to `blog/my-article/index.html`, as today.
- `"file"`: `/blog/my-article` is written to `blog/my-article.html`.

I borrowed the terminology from Astro: `build.format` with `'directory'` and `'file'` became `prerenderFormat` with the same values.
All other options stay as they are, the builder passes them on to `@angular/build:application`.

A static build is required, by design.
An `ssr` entry is fine as long as `outputMode` is `"static"`: Angular then uses it only during `ng build` to prerender the pages, and no server is deployed.
If your build deploys a server (`"outputMode": "server"`, or `ssr` without `outputMode`), `ng add` and `ng build` stop with a clear error.
With a server, there is nothing to fix anyway: the Node.js server generated by Angular serves static files with `redirect: false`, so `/blog/my-article` is never redirected to `/blog/my-article/` in the first place.

### How it works

The builder calls `buildApplication()` from `@angular/build` and replaces the internal function `prerenderPages()` at runtime, to rename the files before they are written.
That's a hack.
It relies on internal APIs, which is why I narrowed it down to Angular 22 only.
But it's a well-tested hack: it writes the same files as my patch for the Angular CLI, and it runs on the websites of [Angular.Schule](https://angular.schule) and the [Angular book](https://angular-buch.com).
I hope I don't have to maintain this package longer than necessary, because I have also prepared a sustainable fix.

## The real fix: an option in the Angular CLI

A built-in option for the Angular CLI is the clean solution.
My colleague Ferdinand Malcher opened an issue for this back in 2024: [angular/angular-cli#29173](https://github.com/angular/angular-cli/issues/29173), *"SSG/Prerendering: Allow generating foo.html instead of foo/index.html"*.
It didn't collect enough votes in the community voting process back then.
That's a pity. Let's hope the problem gets more attention now.

So I wrote the pull request myself: **[angular/angular-cli#34180](https://github.com/angular/angular-cli/pull/34180)** adds the same option `prerenderFormat` to Angular's own application builder:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "outputMode": "static",
    "prerenderFormat": "file"
  }
}
```

Once it lands, you only switch the builder name back to `@angular/build:application`.
That's the plan.

**If you want this in Angular, please give the [issue](https://github.com/angular/angular-cli/issues/29173) a 👍. Upvoting the [pull request](https://github.com/angular/angular-cli/pull/34180) could be helpful, too! :-)**
The Angular team decides based on community votes.

## Two things to watch out for

### A route called `index`

With `'file'`, a route `/index` would be written to `index.html` and overwrite your start page.
A route `/blog/index` would become `blog/index.html`, which web servers serve for `/blog/`, not for `/blog/index`.
Both builder and pull request stop with an error in this case.

### Your local preview server

If you preview the build locally with `express.static`, watch out: with `blog.html` next to the folder `blog/`, `express.static` finds the folder first and redirects `/blog` to `/blog/`.
To fix that, add a small middleware in front of `express.static`: for a request like `/blog`, it checks whether `blog.html` exists and sends that file directly.
Only if there is no such file does the request go on to `express.static`:

```typescript
app.use((req, res, next) => {
  if (req.path.endsWith('/') || path.extname(req.path)) { return next(); }
  const file = path.join(distFolder, decodeURIComponent(req.path) + '.html');
  if (file.startsWith(distFolder) && fs.existsSync(file)) { return res.sendFile(file); }
  next();
});
app.use(express.static(distFolder));
```

## Conclusion

Angular's prerendering writes every route into a folder, and static hosts answer that with a redirect to a trailing slash.
Today, you have to choose between nice URLs and a site without redirects.

**We deserve both.**
Write `<route>.html` instead of `<route>/index.html`, and static hosts serve your pages directly under clean URLs.
Until Angular supports this natively, two commands are enough:

```bash
ng add @angular-schule/prerender-format
ng build
```

And if you'd like to see this in Angular itself, please vote for the [issue](https://github.com/angular/angular-cli/issues/29173) and the [pull request](https://github.com/angular/angular-cli/pull/34180). 🚀

<hr>

**Further Reading:**

- [angular/angular-cli#29173: SSG/Prerendering: Allow generating foo.html instead of foo/index.html](https://github.com/angular/angular-cli/issues/29173)
- [angular/angular-cli#34180: feat(@angular/build): add `prerenderFormat` option](https://github.com/angular/angular-cli/pull/34180)
- [`@angular-schule/prerender-format` on npm](https://www.npmjs.com/package/@angular-schule/prerender-format) and [on GitHub](https://github.com/angular-schule/prerender-format)
- [Astro: `build.format`](https://docs.astro.build/en/reference/configuration-reference/#buildformat)
- [Angular: Server-side and hybrid rendering](https://angular.dev/guide/ssr)
- [Angular: `TrailingSlashPathLocationStrategy`](https://angular.dev/api/common/TrailingSlashPathLocationStrategy)

<small><em>Header image: photo from <a href="https://pxhere.com/en/photo/593969">pxhere</a> (CC0), Angular logo by Google (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).</em></small>
