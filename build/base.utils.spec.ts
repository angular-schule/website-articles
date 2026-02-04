import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readMarkdownFile, getEntryList, markdownToEntry } from './base.utils';
import { EntryBase } from './base.types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('base.utils', () => {

  describe('readMarkdownFile', () => {
    it('should throw error for non-existent file', async () => {
      await expect(readMarkdownFile('/non/existent/path/README.md'))
        .rejects
        .toThrow();
    });
  });

  describe('getEntryList - Error Handling', () => {
    const testDir = '/tmp/test-blog-entries-' + Date.now();

    beforeEach(async () => {
      // Create test directory structure
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should throw error when README.md is missing in entry folder', async () => {
      // Create folder without README.md
      await fs.mkdir(path.join(testDir, 'broken-entry'), { recursive: true });

      await expect(getEntryList<EntryBase>(testDir, 'https://example.com/'))
        .rejects
        .toThrow();
    });

    it('should throw error when folder contains invalid markdown', async () => {
      // Create folder with README.md that has invalid YAML
      const entryDir = path.join(testDir, 'invalid-yaml-entry');
      await fs.mkdir(entryDir, { recursive: true });
      await fs.writeFile(
        path.join(entryDir, 'README.md'),
        '---\ninvalid: yaml: syntax: here\n---\nContent'
      );

      await expect(getEntryList<EntryBase>(testDir, 'https://example.com/'))
        .rejects
        .toThrow();
    });

    it('should process valid entries without error', async () => {
      // Create valid entry
      const entryDir = path.join(testDir, 'valid-entry');
      await fs.mkdir(entryDir, { recursive: true });
      await fs.writeFile(
        path.join(entryDir, 'README.md'),
        '---\ntitle: Test\npublished: 2024-01-01\n---\n\n# Hello'
      );

      const result = await getEntryList<EntryBase>(testDir, 'https://example.com/');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('valid-entry');
    });

    it('should abort on first error, not continue with other entries', async () => {
      // Create two entries: first broken, second valid
      const brokenDir = path.join(testDir, 'aaa-broken'); // sorts first alphabetically
      const validDir = path.join(testDir, 'zzz-valid');

      await fs.mkdir(brokenDir, { recursive: true });
      await fs.mkdir(validDir, { recursive: true });

      // No README.md in broken dir
      await fs.writeFile(
        path.join(validDir, 'README.md'),
        '---\ntitle: Valid\npublished: 2024-01-01\n---\nContent'
      );

      // Should throw, not return partial results
      await expect(getEntryList<EntryBase>(testDir, 'https://example.com/'))
        .rejects
        .toThrow();
    });
  });

  describe('markdownToEntry', () => {
    it('should throw when header image does not exist', async () => {
      const markdown = '---\ntitle: Test\npublished: 2024-01-01\nheader: non-existent.jpg\n---\nContent';

      await expect(markdownToEntry<EntryBase>(
        markdown,
        'test-entry',
        'https://example.com/',
        '/non/existent/path'
      )).rejects.toThrow();
    });

    it('should convert emoji shortcodes to unicode emojis', async () => {
      const markdown = '---\ntitle: Test\npublished: 2024-01-01\n---\n\nHello :smile: World :rocket:';

      const result = await markdownToEntry<EntryBase>(
        markdown,
        'test-entry',
        'https://example.com/',
        '/tmp'
      );

      // node-emoji converts :smile: to 😄 and :rocket: to 🚀
      expect(result.html).toContain('😄');
      expect(result.html).toContain('🚀');
      expect(result.html).not.toContain(':smile:');
      expect(result.html).not.toContain(':rocket:');
    });

    it('should parse published date as Date object (not string)', async () => {
      const markdown = '---\ntitle: Test\npublished: 2024-06-15\n---\nContent';

      const result = await markdownToEntry<EntryBase>(
        markdown,
        'test-entry',
        'https://example.com/',
        '/tmp'
      );

      // js-yaml parses unquoted dates as Date objects
      expect(result.meta.published).toBeInstanceOf(Date);
      expect(result.meta.published.getFullYear()).toBe(2024);
      expect(result.meta.published.getMonth()).toBe(5); // June is 5 (0-indexed)
      expect(result.meta.published.getDate()).toBe(15);
    });

    it('should set slug from folder name', async () => {
      const markdown = '---\ntitle: Test\npublished: 2024-01-01\n---\nContent';

      const result = await markdownToEntry<EntryBase>(
        markdown,
        'my-awesome-post',
        'https://example.com/',
        '/tmp'
      );

      expect(result.slug).toBe('my-awesome-post');
    });
  });

  describe('getEntryList - Sorting', () => {
    const testDir = '/tmp/test-blog-sorting-' + Date.now();

    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    /**
     * SORTING BEHAVIOR DOCUMENTATION:
     * --------------------------------
     * getSortKey uses `+entry.meta.published` to convert dates to timestamps.
     *
     * IMPORTANT: js-yaml parses unquoted dates (e.g., `published: 2024-01-15`)
     * as JavaScript Date objects, NOT strings!
     *
     * - `+DateObject` = timestamp (number) -> sorts correctly
     * - `+"2024-01-15"` = NaN (if it were a string)
     *
     * Our YAML files use unquoted dates, so js-yaml gives us Date objects,
     * and the sorting works correctly. This is NOT a bug.
     */

    it('should sort entries by published date (newest first)', async () => {
      // js-yaml parses unquoted dates as Date objects, so sorting works
      const entries = [
        { dir: 'middle-post', date: '2024-06-15' },
        { dir: 'oldest-post', date: '2023-01-01' },
        { dir: 'newest-post', date: '2025-12-31' },
      ];

      for (const e of entries) {
        const entryDir = path.join(testDir, e.dir);
        await fs.mkdir(entryDir, { recursive: true });
        await fs.writeFile(
          path.join(entryDir, 'README.md'),
          `---\ntitle: ${e.dir}\npublished: ${e.date}\n---\nContent`
        );
      }

      const result = await getEntryList<EntryBase>(testDir, 'https://example.com/');

      expect(result).toHaveLength(3);
      // Newest first (descending order)
      expect(result[0].slug).toBe('newest-post');   // 2025-12-31
      expect(result[1].slug).toBe('middle-post');   // 2024-06-15
      expect(result[2].slug).toBe('oldest-post');   // 2023-01-01
    });

    it('should sort sticky entries before non-sticky entries', async () => {
      const entries = [
        { dir: 'normal-new', date: '2025-01-01', sticky: false },
        { dir: 'sticky-old', date: '2020-01-01', sticky: true },
        { dir: 'normal-old', date: '2020-01-01', sticky: false },
      ];

      for (const e of entries) {
        const entryDir = path.join(testDir, e.dir);
        await fs.mkdir(entryDir, { recursive: true });
        const stickyLine = e.sticky ? 'sticky: true\n' : '';
        await fs.writeFile(
          path.join(entryDir, 'README.md'),
          `---\ntitle: ${e.dir}\npublished: ${e.date}\n${stickyLine}---\nContent`
        );
      }

      const result = await getEntryList<EntryBase>(testDir, 'https://example.com/');

      expect(result).toHaveLength(3);
      // Sticky first, then by date
      expect(result[0].slug).toBe('sticky-old');    // sticky, even though old
      expect(result[1].slug).toBe('normal-new');    // 2025-01-01
      expect(result[2].slug).toBe('normal-old');    // 2020-01-01
    });

    it('should use slug as tiebreaker for same date', async () => {
      const entries = [
        { dir: 'zzz-post', date: '2024-01-01' },
        { dir: 'aaa-post', date: '2024-01-01' },
        { dir: 'mmm-post', date: '2024-01-01' },
      ];

      for (const e of entries) {
        const entryDir = path.join(testDir, e.dir);
        await fs.mkdir(entryDir, { recursive: true });
        await fs.writeFile(
          path.join(entryDir, 'README.md'),
          `---\ntitle: ${e.dir}\npublished: ${e.date}\n---\nContent`
        );
      }

      const result = await getEntryList<EntryBase>(testDir, 'https://example.com/');

      expect(result).toHaveLength(3);
      // Same date, sorted by slug descending (Z first)
      expect(result[0].slug).toBe('zzz-post');
      expect(result[1].slug).toBe('mmm-post');
      expect(result[2].slug).toBe('aaa-post');
    });
  });
});
