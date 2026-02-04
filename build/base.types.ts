export interface EntryMetaBase {
  title: string;
  /**
   * IMPORTANT: js-yaml parses unquoted YAML dates as JavaScript Date objects!
   * In YAML: `published: 2024-01-15` (unquoted) → Date object
   * In YAML: `published: "2024-01-15"` (quoted) → string
   * Our blog posts use unquoted dates, so this is a Date.
   */
  published: Date;
  lastModified?: Date;
  hidden?: boolean;
  sticky?: boolean;
}

export interface EntryBase {
  slug: string;
  html: string;
  meta: EntryMetaBase;
}
