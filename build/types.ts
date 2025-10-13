export interface BlogEntryMeta {
  title: string;
  hidden: boolean;
  author: string;
  mail: string;
  bio?: string;
  twitter?: string;

  author2?: string;
  mail2?: string;
  bio2?: string;
  twitter2?: string;

  published: Date | string; // Date on backend, ISO-formated string on client, foo!
  'last-change'?: Date | string; // Date on backend, ISO-formated string on client, foo!
  keywords?: string[];
  language: string;
  header: {
    url: string;
    width: number;
    height: number;
  };
  'darken-header': boolean;
  category: string; // schule, buch, general
  sticky?: boolean;
}


export interface BlogEntry {
  slug: string; // SEO-friendly path
  html: string;
  error: string;
  meta: BlogEntryMeta;
}

export interface BlogEntryLight {
  slug: string;
  html: string;
  meta: {
    title: string;

    author: string;
    mail: string;
    twitter?: string;

    author2?: string;
    mail2?: string;
    twitter2?: string;

    published: Date | string;
    language: string;
    header: {
      url: string;
      width: number;
      height: number;
    };
  };
}
