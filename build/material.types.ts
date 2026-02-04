import { EntryBase, EntryMetaBase } from "./base.types";

/**
 * Material entry metadata.
 * Simpler than blog entries - no author info needed.
 */
export interface MaterialEntryMeta extends EntryMetaBase {
  // Material-specific fields can be added here
}

export interface MaterialEntry extends EntryBase {
  meta: MaterialEntryMeta;
}
