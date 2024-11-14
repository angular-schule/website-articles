import * as emoji from 'node-emoji'
import { JekyllMarkdownParser } from './jekyll-markdown-parser';
import { readdir, readFile } from 'fs/promises';

import { BlogEntry } from './types';

export class BlogService {

  constructor(private markdownBaseUrl: string) {}

  async getBlogEntry(slug: string): Promise<BlogEntry> {
    const blogList = await this.getBlogList();
    const entry = blogList.find(e => e.slug === slug);
    if (!entry) {
      throw new Error(`No entry found for "${slug}"`);
    }
    return entry;
  }

  // dead simple way to sort things: create a sort key that can be easily sorted
  private getSortKey(entry: BlogEntry) {
    return (entry.meta.sticky ? 'Z' : 'A') + '---' + (+entry.meta.published) + '---' + entry.slug;
  }

  private async readBlogFolders() {
    const folderContents = await readdir('../blog', { withFileTypes: true });
    return folderContents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  private async readBlogFileFromFolder(folder: string) {
    const path = `../blog/${folder}/README.md`;
    return readFile(path, 'utf8');
  }

  async getBlogList() {
    const blogDirs = await this.readBlogFolders();
    const blogEntries: BlogEntry[] = [];

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
          } as BlogEntry;
          blogEntries.push(errorBlogEntry);
      }
    }

    return blogEntries.sort((a, b) => this.getSortKey(b).localeCompare(this.getSortKey(a)));
  }


  private readmeToBlogEntry(readme: string, folder: string) {
    const parser = new JekyllMarkdownParser(this.markdownBaseUrl + folder);
    const parsedJekyllMarkdown = parser.parse(readme);

    const meta = parsedJekyllMarkdown.parsedYaml || {};

    if (meta.thumbnail &&
      !meta.thumbnail.startsWith('http') &&
      !meta.thumbnail.startsWith('//')) {
      meta.thumbnail = this.markdownBaseUrl + folder + '/' + meta.thumbnail;
    }

    return {
      slug: folder,
      html: emoji.emojify(parsedJekyllMarkdown.html),
      meta: meta
    } as BlogEntry;
  }
}


