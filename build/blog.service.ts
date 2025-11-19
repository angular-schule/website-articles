import * as emoji from 'node-emoji'
import sizeOf from 'image-size';
import { readdir, readFile } from 'fs/promises';

import { JekyllMarkdownParser } from './jekyll-markdown-parser';
import { BlogEntryFull } from './types';
import { BuildConfig } from './config';

export class BlogService {

  constructor(private config: BuildConfig) {}

  /** simple way to sort things: create a sort key that can be easily sorted */
  private getSortKey(entry: BlogEntryFull) {
    return (entry.meta.sticky ? 'Z' : 'A') + '---' + (+entry.meta.published) + '---' + entry.slug;
  }

  /** Read all post folders from the blog directory */
  private async readBlogFolders() {
    const folderContents = await readdir(this.config.blogPostsFolder, { withFileTypes: true });
    return folderContents
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);
  }

  /** Read README file from a blog post folder */
  private async readBlogFileFromFolder(folder: string) {
    const path = `${this.config.blogPostsFolder}/${folder}/README.md`;
    return readFile(path, 'utf8');
  }

  /** read metadata and contents for all blog posts as list */
  async getBlogList() {
    const blogDirs = await this.readBlogFolders();
    const blogEntries: BlogEntryFull[] = [];

    for (const blogDir of blogDirs) {
      try {
        const readme = await this.readBlogFileFromFolder(blogDir);
        const blogEntry = this.readmeToBlogEntry(readme, blogDir);
        blogEntries.push(blogEntry);

      } catch (e: any) {
          const errorBlogEntry = {
            slug: blogDir,
            error: e.message || 'Error',
            meta: {
              title: 'A minor error occurred while reading: ' + blogDir,
              hidden: true
            }
          } as BlogEntryFull;
          blogEntries.push(errorBlogEntry);
      }
    }

    return blogEntries.sort((a, b) => this.getSortKey(b).localeCompare(this.getSortKey(a)));
  }

  /** convert markdown README to full blog post object */
  private readmeToBlogEntry(readmeMarkdown: string, folder: string) {
    const parser = new JekyllMarkdownParser(this.config.markdownBaseUrl + folder + '/');
    const parsedJekyllMarkdown = parser.parse(readmeMarkdown);

    const meta = parsedJekyllMarkdown.parsedYaml || {};

    if (meta.header) {
      const url = meta.header;
      const relativePath = this.config.blogPostsFolder + '/' + folder + '/' + meta.header;
      const { width, height } = this.getImageDimensions(relativePath);
      meta.header = { url, width, height };
    }

    return {
      slug: folder,
      html: emoji.emojify(parsedJekyllMarkdown.html),
      meta
    } satisfies BlogEntryFull;
  }

  private getImageDimensions(path: string) {
    const { width, height } = sizeOf(path);
    return { width, height };
  }
}


