import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { BlogEntry, BlogEntryLight } from './types';
import { existsSync } from 'fs';

export async function writeJSON(path: string, data: any) {
  const fullFilename = join(__dirname, path);
  await writeFile(fullFilename, JSON.stringify(data));
  console.log('Generated file:', fullFilename)
}

export async function createFolderIfNotExists(folder: string) {
  if (!existsSync(folder)) {
    await mkdir(folder, { recursive: true });
  }
}

export function extractFirstBigParagraph(html: string): string {
  if (!html) {
    return '';
  }

  const withoutImageTags = html.replace(/<img[^>]*>/g, '');

  // [\s\S] --> as an alternative for /.../s modifier
  const matches = withoutImageTags.match(/<p[^>]*>([\s\S]*?)<\/p>/mg);

  if (!matches) {
    return '';
  }

  for (const match of matches) {
    if (match && match.length > 100) {
      return match;
    }
  }

  return '';
}


export function makeLightBlogList(fullList: BlogEntry[]) {
  return fullList
    .filter(entry => !entry.meta.hidden)
    .map(entry => {
      const result: BlogEntryLight = {
        slug: entry.slug,
        html: extractFirstBigParagraph(entry.html),
        meta: {
          title: entry.meta.title,
          author: entry.meta.author,
          mail: entry.meta.mail,
          published: entry.meta.published,
          thumbnail: entry.meta.thumbnail,
        },
      };

      if (entry.meta.twitter) { result.meta.twitter = entry.meta.twitter; }
      if (entry.meta.author2) { result.meta.author2 = entry.meta.author2; }
      if (entry.meta.mail2) { result.meta.mail2 = entry.meta.mail2; }
      if (entry.meta.twitter2) { result.meta.twitter2 = entry.meta.twitter2; }

      return result;
    });
}
