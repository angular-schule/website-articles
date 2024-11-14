import { config } from './config';
import { BlogService } from './blog.service';
import { writeJSON, makeLightBlogList, createFolderIfNotExists } from './utils';

import { copy, remove } from 'fs-extra';

(async () => {
  const blogService = new BlogService(config.markdownBaseUrl);

  await remove('./dist');
  await createFolderIfNotExists('./dist/data/posts');
  await createFolderIfNotExists('./dist/assets');
  await copy('../blog', './dist/');
  await copy('../index.html', './dist/index.html');

  const blogList = await blogService.getBlogList();
  const blogListLight = makeLightBlogList(blogList);
  await writeJSON('./dist/bloglist.json', blogListLight);

  blogList.forEach(async (entry) => {
    await writeJSON(`./dist/${entry.slug}/entry.json`, entry);
    await remove(`./dist/${entry.slug}/README.md`);
  });
})();
