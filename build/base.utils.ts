import * as emoji from 'node-emoji'
import { imageSizeFromFile } from 'image-size/fromFile';
import { readdir, readFile } from 'fs/promises';
import { copy, remove, writeJson, mkdirp } from 'fs-extra';

import { JekyllMarkdownParser } from './jekyll-markdown-parser';
import { EntryBase } from './base.types';

/** Read all subdirectory names from a base path (excluding those starting with _) */
export async function readFolders(basePath: string): Promise<string[]> {
  const folderContents = await readdir(basePath, { withFileTypes: true });
  return folderContents
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => !dirent.name.startsWith('_'))
    .map(dirent => dirent.name);
}

/** Read a markdown file from disk */
export async function readMarkdownFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

/** Get width and height of an image */
export async function getImageDimensions(imagePath: string): Promise<{ width: number | undefined; height: number | undefined }> {
  const { width, height } = await imageSizeFromFile(imagePath);
  return { width, height };
}

/** Copy folder entries to dist, remove source file, and write entry.json */
export async function copyEntriesToDist<T extends { slug: string }>(
  entries: T[],
  sourceFolder: string,
  distFolder: string
): Promise<void> {
  // Process sequentially to fail fast on first error
  for (const entry of entries) {
    const entryDistFolder = `${distFolder}/${entry.slug}`;

    await mkdirp(entryDistFolder);
    await copy(`${sourceFolder}/${entry.slug}`, entryDistFolder);
    await remove(`${entryDistFolder}/README.md`);

    const entryJsonPath = `${entryDistFolder}/entry.json`;
    await writeJson(entryJsonPath, entry);
    console.log('Generated post file:', entryJsonPath);
  }
}

/** Simple way to sort things: create a sort key that can be easily sorted */
function getSortKey(entry: EntryBase): string {
  // js-yaml parses unquoted dates (e.g., `published: 2024-01-15`) as Date objects.
  // The unary + converts Date to timestamp (number), which sorts correctly.
  // Note: If the date were a string, +string would return NaN, but our YAML
  // files use unquoted dates, so this works correctly.
  return (entry.meta.sticky ? 'Z' : 'A') + '---' + (+entry.meta.published) + '---' + entry.slug;
}


/**
 * Convert markdown README to full blog post object.
 *
 * IMPORTANT: This function transforms raw YAML data into the target type T.
 * The generic T is a type ASSERTION - the function trusts that the YAML
 * contains all required properties. If YAML is incomplete, runtime errors
 * may occur elsewhere. This is acceptable because we control all blog posts.
 *
 * Transformation details:
 * - `header` (string in YAML) → `header` (object with url/width/height)
 * - Emojis in HTML are converted via node-emoji
 */
export async function markdownToEntry<T extends EntryBase>(
  markdown: string,
  folder: string,
  baseUrl: string,
  blogPostsFolder: string
): Promise<T> {
  const parser = new JekyllMarkdownParser(baseUrl + folder + '/');
  const parsedJekyllMarkdown = parser.parse(markdown);

  const meta = parsedJekyllMarkdown.parsedYaml || {};

  // Transform header from string (YAML) to object with dimensions
  if (meta.header) {
    const url = meta.header;  // Original string from YAML
    const relativePath = blogPostsFolder + '/' + folder + '/' + meta.header;
    const { width, height } = await getImageDimensions(relativePath);
    meta.header = { url, width, height };
  }

  return {
    slug: folder,
    html: emoji.emojify(parsedJekyllMarkdown.html),
    meta
  } as T;
}

/** Read metadata and contents for all entries as list */
export async function getEntryList<T extends EntryBase>(entriesFolder: string, markdownBaseUrl: string): Promise<T[]> {
  const entryDirs = await readFolders(entriesFolder);
  const entries: T[] = [];

  for (const entryDir of entryDirs) {
    const readmePath = `${entriesFolder}/${entryDir}/README.md`;
    const readme = await readMarkdownFile(readmePath);
    const entry = await markdownToEntry<T>(readme, entryDir, markdownBaseUrl, entriesFolder);
    entries.push(entry);
  }

  return entries.sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));
}
