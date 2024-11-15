import { copy, remove, writeJson, mkdirp } from 'fs-extra';

import { buildConfig } from './config';
import { BlogService } from './blog.service';
import { makeLightBlogList } from './utils';

(async () => {
  const blogService = new BlogService(buildConfig);

  // empty dist folder (for local builds)
  await remove(buildConfig.distFolder);
  await mkdirp(buildConfig.distFolder);

  // copy static files (images, etc.) to dist folder
  await copy(buildConfig.blogPostsFolder, buildConfig.distFolder);
  await copy('../index.html', buildConfig.distFolder + '/index.html');
  console.log('Copied static files to dist');

  // generate light blog list
  const blogList = await blogService.getBlogList();
  const blogListLight = makeLightBlogList(blogList);
  await writeJson(buildConfig.distFolder + '/bloglist.json', blogListLight);

  // replace README with entry.json for all blog posts
  blogList.forEach(async (entry) => {
    const entryJsonPath = `${buildConfig.distFolder}/${entry.slug}/entry.json`;
    await writeJson(entryJsonPath, entry);
    await remove(`${buildConfig.distFolder}/${entry.slug}/README.md`);
    console.log('Generated post file:', entryJsonPath);
  });
})();
