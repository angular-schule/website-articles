# website-articles-build

Shared build scripts for processing Markdown blog entries into JSON.

Used as a git subtree in:
- [angular-buch/website-articles](https://github.com/angular-buch/website-articles)
- [angular-schule/website-articles](https://github.com/angular-schule/website-articles)

## Usage

```bash
# Set the base URL for generated links
export MARKDOWN_BASE_URL=https://your-domain.com/

# Run the build
npm run build
```

## Build Scripts

| Script           | Description                                                      |
|------------------|------------------------------------------------------------------|
| `build:init`     | Clears `dist/`                                                   |
| `build:blog`     | Builds blog entries from `../blog/` → `dist/blog/`               |
| `build:material` | Builds material entries from `../material/` → `dist/material/`   |

**Note:** `build:material` gracefully exits if no `../material/` folder exists.

## Configuration

The only configuration is the `MARKDOWN_BASE_URL` environment variable. All paths are hardcoded:
- Blog source: `../blog/`
- Material source: `../material/`
- Output: `./dist/`

## Syncing Changes

**Push changes from a consumer repo:**
```bash
git subtree push --prefix=build git@github.com:angular-schule/website-articles-build.git main
```

**Pull changes into a consumer repo:**
```bash
git subtree pull --prefix=build git@github.com:angular-schule/website-articles-build.git main --squash
```

## Tests

```bash
npm test
```
