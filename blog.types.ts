import { EntryBase, EntryMetaBase } from "./base.types";

/**
 * Blog entry metadata after processing.
 *
 * NOTE: In the raw YAML, `header` is a string (filename).
 * After processing in markdownToEntry(), it becomes an object with url/width/height.
 * These types represent the PROCESSED output, not the raw YAML input.
 */
export interface BlogEntryMeta extends EntryMetaBase {
  isUpdatePost?: boolean;
  author: string;
  author2?: string;
  mail: string;
  mail2?: string;
  language: string;
  /**
   * Header image info. In YAML this is just a filename string,
   * but markdownToEntry() transforms it to this object structure.
   */
  header?: {
    url: string;
    width: number | undefined;
    height: number | undefined;
  };
}

export interface BlogEntry extends EntryBase {
  meta: BlogEntryMeta;
}

export interface BlogEntryFullMeta extends BlogEntryMeta {
  bio?: string;
  bio2?: string;
  keywords?: string[];
  'darken-header'?: boolean;
}

export interface BlogEntryFull extends BlogEntry {
  meta: BlogEntryFullMeta;
}
