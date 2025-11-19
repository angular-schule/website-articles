import { copy, remove, writeJson, mkdirp } from 'fs-extra';

import { buildConfig } from './config';
import { BlogService } from './blog.service';
import { makeLightBlogList } from './utils';

(async () => {
  const blogService = new BlogService(buildConfig);

  // empty dist folder (for local builds)
  await remove(buildConfig.distFolder);
  await mkdirp(buildConfig.distFolder);

  // copy static index.html
  await copy('../index.html', buildConfig.distFolder + '/index.html');

  // generate light blog list
  const blogList = await blogService.getBlogList();
  const blogListLight = makeLightBlogList(blogList);
  await writeJson(buildConfig.distFolder + '/bloglist.json', blogListLight);

  // replace README with entry.json for all blog posts
  await Promise.all(blogList.map(async (entry) => {
    try {
      const entryDistFolder = `${buildConfig.distFolder}/${entry.slug}`;

      await mkdirp(entryDistFolder);
      await copy(buildConfig.blogPostsFolder + '/' + entry.slug, entryDistFolder);
      await remove(`${entryDistFolder}/README.md`);

      const entryJsonPath = `${entryDistFolder}/entry.json`;
      await writeJson(entryJsonPath, entry);
      console.log('Generated post file:', entryJsonPath);
    } catch (error: any) {
      console.error(`Failed to process ${entry.slug}:`, error.message);
    }
  }));
})();
