import { BlogEntry, BlogEntryFull } from './blog.types';

/**
 * Strip all HTML tags from a string to get plain text.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Extract the first "big" paragraph from HTML content.
 * A paragraph is considered "big" if its TEXT content (not HTML) is > 100 chars.
 * Falls back to first paragraph if no big paragraph exists.
 */
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

  // Find first paragraph where TEXT content (not HTML) is > 100 chars
  // Fall back to first paragraph if none is big enough
  const bigParagraph = matches.find(m => m && stripHtmlTags(m).length > 100);
  const paragraph = bigParagraph || matches[0] || '';
  // strip anchor tags but retain link text
  const result = paragraph.replace(/<a\s.*?>(.*?)<\/a>/g, '$1');

  return result;
}



export function makeLightBlogList(fullList: BlogEntryFull[]): BlogEntry[] {
  return fullList
    .filter(entry => !entry.meta.hidden)
    .map(entry => {
      const result: BlogEntry = {
        slug: entry.slug,
        html: extractFirstBigParagraph(entry.html),
        meta: {
          title: entry.meta.title,
          author: entry.meta.author,
          mail: entry.meta.mail,
          published: entry.meta.published,
          language: entry.meta.language,
          header: entry.meta.header,
        },
      };

      if (entry.meta.author2) { result.meta.author2 = entry.meta.author2; }
      if (entry.meta.mail2) { result.meta.mail2 = entry.meta.mail2; }
      if (entry.meta.isUpdatePost) { result.meta.isUpdatePost = entry.meta.isUpdatePost; }

      return result;
    });
}
