# website-articles

This repo contains content for [https://angular.schule/blog](https://angular.schule/blog/).
Pull requests are welcome!

## Post Frontmatter

| Property       | Description                                                                                 |
|----------------|---------------------------------------------------------------------------------------------|
| `hidden`       | Hide post in list                                                                           |
| `sticky`       | Stick post to the top of the list                                                           |

## Build

**Frischer Clone:**
```bash
git clone --recurse-submodules git@github.com:angular-schule/website-articles.git
cd website-articles/build && npm install && npm run build
```

**Bestehendes Repo:**
```bash
git submodule update --init
cd build && npm install && npm run build
```

The `build/` folder is a [git submodule](https://github.com/angular-schule/website-articles-build) shared with [angular-buch/website-articles](https://github.com/angular-buch/website-articles).

## Lokale Entwicklung

Für lokale Entwicklung mit der Website müssen beide Repos nebeneinander liegen:

```
parent-folder/
├── angular-schule-website/  ← Website
└── website-articles/        ← Dieses Repo
```

Dann in `angular-schule-website`:
```bash
npm run start:local
```
