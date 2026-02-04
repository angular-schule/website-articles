import { mkdirp, writeJson } from 'fs-extra';

import { BlogEntryFull } from './blog.types';
import { copyEntriesToDist, getEntryList } from './base.utils';
import { makeLightBlogList } from './blog.utils';

const MARKDOWN_BASE_URL = process.env.MARKDOWN_BASE_URL;
const BLOG_POSTS_FOLDER = '../blog';
const DIST_FOLDER = './dist';

async function build(): Promise<void> {
  if (!MARKDOWN_BASE_URL) {
    throw new Error('MARKDOWN_BASE_URL environment variable is required');
  }

  const blogDist = DIST_FOLDER + '/blog';
  await mkdirp(blogDist);

  const entryList = await getEntryList<BlogEntryFull>(BLOG_POSTS_FOLDER, MARKDOWN_BASE_URL + 'blog/');
  const blogListLight = makeLightBlogList(entryList);
  await writeJson(blogDist + '/bloglist.json', blogListLight);
  await copyEntriesToDist(entryList, BLOG_POSTS_FOLDER, blogDist);
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
