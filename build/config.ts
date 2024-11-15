export interface BuildConfig {
  markdownBaseUrl: string;
  distFolder: string;
  blogPostsFolder: string;
}

export const buildConfig: BuildConfig = {
  markdownBaseUrl: 'https://angular-schule.github.io/website-articles/',
  distFolder: './dist',
  blogPostsFolder: '../blog'
};
