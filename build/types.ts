export interface BlogEntryMeta {
  title: string;
  isUpdatePost?: boolean;
  author: string;
  author2?: string;
  mail: string;
  mail2?: string;
  published: string;
  language: string;
  header: {
    url: string;
    width: number;
    height: number;
  };
}

export interface BlogEntry {
  slug: string;
  html: string;
  meta: BlogEntryMeta
}

export interface BlogEntryFullMeta extends BlogEntryMeta {
  hidden?: boolean;
  bio?: string;
  bio2?: string;
  lastModified?: string;
  keywords?: string[];
  'darken-header': boolean;
  sticky?: boolean;
}

export interface BlogEntryFull extends BlogEntry {
  error?: string;
  meta: BlogEntryFullMeta;
}
