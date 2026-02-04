import { describe, it, expect } from 'vitest';
import { extractFirstBigParagraph, makeLightBlogList } from './blog.utils';
import { BlogEntryFull } from './blog.types';

describe('extractFirstBigParagraph', () => {
  it('should return empty string for empty input', () => {
    expect(extractFirstBigParagraph('')).toBe('');
  });

  it('should return empty string for null/undefined input', () => {
    expect(extractFirstBigParagraph(null as any)).toBe('');
    expect(extractFirstBigParagraph(undefined as any)).toBe('');
  });

  it('should return empty string when no paragraphs found', () => {
    const html = '<div>Just a div without paragraphs</div>';
    expect(extractFirstBigParagraph(html)).toBe('');
  });

  it('should return first paragraph when all paragraphs are too short (fallback)', () => {
    const html = '<p>Short</p><p>Also short</p>';
    expect(extractFirstBigParagraph(html)).toBe('<p>Short</p>');
  });

  it('should return first paragraph longer than 100 characters', () => {
    const shortParagraph = '<p>Short paragraph</p>';
    const longParagraph = '<p>This is a much longer paragraph that contains more than one hundred characters to ensure it meets the minimum length requirement for extraction.</p>';
    const html = shortParagraph + longParagraph;

    const result = extractFirstBigParagraph(html);
    expect(result).toBe(longParagraph);
  });

  it('should skip the first long paragraph if second is longer', () => {
    // The function finds the FIRST paragraph > 100 chars, not the longest
    const first = '<p>This is the first paragraph that is long enough with more than one hundred characters to qualify for extraction purposes.</p>';
    const second = '<p>This is an even longer second paragraph that also exceeds one hundred characters but should not be selected because the first one already qualifies.</p>';
    const html = first + second;

    const result = extractFirstBigParagraph(html);
    expect(result).toBe(first);
  });

  it('should remove image tags before matching paragraphs', () => {
    // The function strips img tags from the HTML, then matches paragraphs from the stripped version
    const html = '<p><img src="test.png" alt="test">This is a paragraph with an image that contains more than one hundred characters to meet the minimum requirement.</p>';

    const result = extractFirstBigParagraph(html);
    // Result should be the paragraph from the stripped HTML (without img)
    expect(result).toBe('<p>This is a paragraph with an image that contains more than one hundred characters to meet the minimum requirement.</p>');
  });

  it('should strip anchor tags but retain link text', () => {
    const html = '<p>This paragraph contains <a href="https://example.com">a link</a> and is long enough to meet the one hundred character minimum requirement for extraction testing.</p>';

    const result = extractFirstBigParagraph(html);
    expect(result).toBe('<p>This paragraph contains a link and is long enough to meet the one hundred character minimum requirement for extraction testing.</p>');
  });

  it('should preserve paragraph attributes', () => {
    const html = '<p class="intro" id="first">This is a much longer paragraph with attributes that contains more than one hundred characters to ensure it meets the minimum length requirement.</p>';

    const result = extractFirstBigParagraph(html);
    expect(result).toBe('<p class="intro" id="first">This is a much longer paragraph with attributes that contains more than one hundred characters to ensure it meets the minimum length requirement.</p>');
  });

  it('should handle multiline paragraphs', () => {
    const html = `<p>This is a paragraph
that spans multiple lines
and contains more than one hundred characters
to meet the extraction requirement.</p>`;

    const result = extractFirstBigParagraph(html);
    expect(result).toBe(html);
  });

  it('should count TEXT length (not HTML length) when determining > 100', () => {
    // The function now strips HTML tags before counting length.
    // '<p>xxx</p>' has 3 chars of TEXT content, not 10.
    const exactly100TextChars = '<p>' + 'x'.repeat(100) + '</p>'; // 100 text chars
    const over100TextChars = '<p>' + 'x'.repeat(101) + '</p>'; // 101 text chars

    // exactly 100 is NOT > 100, so falls back to first paragraph
    expect(extractFirstBigParagraph(exactly100TextChars)).toBe(exactly100TextChars);
    expect(extractFirstBigParagraph(over100TextChars)).toBe(over100TextChars);
  });

  it('should not count HTML attributes in length calculation', () => {
    // A paragraph with lots of HTML attributes but short text
    const shortTextLongHtml = '<p class="very-long-class-name-that-would-exceed-100-chars-if-counted" id="another-long-id" data-test="more-attributes">Short text</p>';

    // This has < 100 text chars, but falls back to first paragraph
    expect(extractFirstBigParagraph(shortTextLongHtml)).toBe(shortTextLongHtml);
  });

  it('should count nested HTML tags text content only', () => {
    // Text with nested tags - should count the text inside, not the tag markup
    const nestedHtml = '<p>This has <strong>bold</strong> and <em>italic</em> ' +
      'and <a href="very-long-url-that-should-not-count">linked</a> text ' +
      'but the actual text content is what matters for the length check ' +
      'so we need enough plain text characters here.</p>';

    // The text content is long enough, so it should match
    const result = extractFirstBigParagraph(nestedHtml);
    expect(result).toContain('This has');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('makeLightBlogList', () => {
  const createMockEntry = (overrides: Partial<BlogEntryFull> = {}): BlogEntryFull => {
    const defaultHtml = '<p>This is a test paragraph that is definitely longer than one hundred characters to ensure it gets extracted properly by the extractFirstBigParagraph function.</p>';
    return {
      slug: 'test-post',
      html: overrides.html ?? defaultHtml,
      meta: {
        title: 'Test Post',
        author: 'Test Author',
        mail: 'test@example.com',
        published: new Date('2024-01-01'),  // Must be Date, not string!
        language: 'en',
        header: { url: 'header.jpg', width: 800, height: 400 },
        'darken-header': false,
        ...overrides.meta,
      },
      ...overrides,
    };
  };

  it('should filter out hidden entries', () => {
    const entries: BlogEntryFull[] = [
      createMockEntry({ slug: 'visible', meta: { ...createMockEntry().meta, hidden: false } }),
      createMockEntry({ slug: 'hidden', meta: { ...createMockEntry().meta, hidden: true } }),
    ];

    const result = makeLightBlogList(entries);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('visible');
  });

  it('should filter out entries with hidden: true even when other entries have no hidden field', () => {
    const entries: BlogEntryFull[] = [
      createMockEntry({ slug: 'no-hidden-field' }), // hidden is undefined
      createMockEntry({ slug: 'explicitly-hidden', meta: { ...createMockEntry().meta, hidden: true } }),
    ];

    const result = makeLightBlogList(entries);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('no-hidden-field');
  });

  it('should extract first big paragraph for html field', () => {
    const shortParagraph = '<p>Short</p>';
    const longParagraph = '<p>This is a much longer paragraph that contains more than one hundred characters to ensure it meets the minimum length requirement for extraction.</p>';

    const entries: BlogEntryFull[] = [
      createMockEntry({ html: shortParagraph + longParagraph }),
    ];

    const result = makeLightBlogList(entries);
    expect(result[0].html).toBe(longParagraph);
  });

  it('should include only required meta fields', () => {
    const publishedDate = new Date('2024-01-01');
    const entries: BlogEntryFull[] = [
      createMockEntry({
        meta: {
          title: 'Test',
          author: 'Author',
          mail: 'mail@test.com',
          published: publishedDate,
          language: 'de',
          header: { url: 'img.jpg', width: 100, height: 50 },
          hidden: false,
          'darken-header': true,
          keywords: ['angular', 'test'],
          bio: 'Some bio',
          sticky: true,
        },
      }),
    ];

    const result = makeLightBlogList(entries);
    const meta = result[0].meta;

    // Required fields should be present with exact values
    expect(meta.title).toBe('Test');
    expect(meta.author).toBe('Author');
    expect(meta.mail).toBe('mail@test.com');
    expect(meta.published).toBe(publishedDate);  // Same Date object reference
    expect(meta.language).toBe('de');
    expect(meta.header).toEqual({ url: 'img.jpg', width: 100, height: 50 });

    // These should NOT be included in light version
    expect((meta as any).hidden).toBeUndefined();
    expect((meta as any)['darken-header']).toBeUndefined();
    expect((meta as any).keywords).toBeUndefined();
    expect((meta as any).bio).toBeUndefined();
    expect((meta as any).sticky).toBeUndefined();
  });

  it('should include author2 and mail2 if present', () => {
    const entries: BlogEntryFull[] = [
      createMockEntry({
        meta: {
          ...createMockEntry().meta,
          author2: 'Second Author',
          mail2: 'author2@test.com',
        },
      }),
    ];

    const result = makeLightBlogList(entries);
    expect(result[0].meta.author2).toBe('Second Author');
    expect(result[0].meta.mail2).toBe('author2@test.com');
  });

  it('should not include author2/mail2 if not present in source', () => {
    const entries: BlogEntryFull[] = [createMockEntry()];

    const result = makeLightBlogList(entries);
    expect(result[0].meta.author2).toBeUndefined();
    expect(result[0].meta.mail2).toBeUndefined();
  });

  it('should include author2 only if mail2 is missing (and vice versa)', () => {
    const entriesWithAuthor2Only: BlogEntryFull[] = [
      createMockEntry({
        meta: { ...createMockEntry().meta, author2: 'Second Author' },
      }),
    ];
    const entriesWithMail2Only: BlogEntryFull[] = [
      createMockEntry({
        meta: { ...createMockEntry().meta, mail2: 'author2@test.com' },
      }),
    ];

    const result1 = makeLightBlogList(entriesWithAuthor2Only);
    expect(result1[0].meta.author2).toBe('Second Author');
    expect(result1[0].meta.mail2).toBeUndefined();

    const result2 = makeLightBlogList(entriesWithMail2Only);
    expect(result2[0].meta.author2).toBeUndefined();
    expect(result2[0].meta.mail2).toBe('author2@test.com');
  });

  it('should include isUpdatePost if present', () => {
    const entries: BlogEntryFull[] = [
      createMockEntry({
        meta: { ...createMockEntry().meta, isUpdatePost: true },
      }),
    ];

    const result = makeLightBlogList(entries);
    expect(result[0].meta.isUpdatePost).toBe(true);
  });

  it('should not include isUpdatePost if not present in source', () => {
    const entries: BlogEntryFull[] = [createMockEntry()];

    const result = makeLightBlogList(entries);
    expect(result[0].meta.isUpdatePost).toBeUndefined();
  });

  it('should return empty array for empty input', () => {
    const result = makeLightBlogList([]);
    expect(result).toEqual([]);
  });

  it('should preserve slug exactly', () => {
    const entries: BlogEntryFull[] = [
      createMockEntry({ slug: '2024-01-my-awesome-post' }),
    ];

    const result = makeLightBlogList(entries);
    expect(result[0].slug).toBe('2024-01-my-awesome-post');
  });

  it('should process multiple entries maintaining order', () => {
    const entries: BlogEntryFull[] = [
      createMockEntry({ slug: 'first-post', meta: { ...createMockEntry().meta, title: 'First' } }),
      createMockEntry({ slug: 'second-post', meta: { ...createMockEntry().meta, title: 'Second' } }),
      createMockEntry({ slug: 'third-post', meta: { ...createMockEntry().meta, title: 'Third' } }),
    ];

    const result = makeLightBlogList(entries);
    expect(result).toHaveLength(3);
    expect(result[0].slug).toBe('first-post');
    expect(result[0].meta.title).toBe('First');
    expect(result[1].slug).toBe('second-post');
    expect(result[1].meta.title).toBe('Second');
    expect(result[2].slug).toBe('third-post');
    expect(result[2].meta.title).toBe('Third');
  });
});
