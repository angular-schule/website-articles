import { load } from 'js-yaml';
import { Marked, Renderer, Tokens } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import hljs from 'highlight.js';

/**
 * ============================================================================
 * MODIFIED PARSER - Based on bouzuya/jekyll-markdown-parser
 * ============================================================================
 *
 * Original source: https://github.com/bouzuya/jekyll-markdown-parser
 * Repository archived on Jun 28, 2020 (read-only, no longer maintained)
 *
 * SECURITY NOTE:
 * --------------
 * This parser does NOT sanitize or escape HTML content. Raw HTML in markdown
 * is passed through intentionally. This is a FEATURE, not a bug.
 *
 * WE TRUST OUR OWN REPOSITORY 100%.
 *
 * All markdown content comes from our own Git repository. There is no
 * user-generated content. XSS is not a concern in this context.
 *
 * CHANGES FROM ORIGINAL:
 * -----------------------
 * 1. BUG FIX: Regex in separate() had typo `/^---s*$/` instead of `/^---\s*$/`.
 *    This bug exists in the original bouzuya source code (never fixed).
 *    The literal `s*` matches zero or more 's' characters, not whitespace.
 *    It worked accidentally because most files use `---\n` without trailing chars.
 *
 * 2. FEATURE: Added _imageRenderer() to transform relative image paths to
 *    absolute URLs using baseUrl (for CDN/deployment support).
 *
 * 3. FEATURE: Added _transformRelativeImagePaths() to handle raw HTML <img>
 *    tags that bypass the markdown renderer.
 *
 * 4. CHANGE: Converted from CommonJS module to ES6 class with constructor
 *    for baseUrl injection.
 *
 * 5. UPGRADE: marked v4 → v17 migration
 *    - Using Marked class instance instead of global marked
 *    - marked-highlight extension for syntax highlighting
 *    - marked-gfm-heading-id extension for heading IDs
 *    - Token-based renderer API (token object instead of separate params)
 * ============================================================================
 */
export class JekyllMarkdownParser {

  private marked: Marked;

  constructor(private baseUrl: string) {
    this.marked = this.createMarkedInstance();
  }

  private createMarkedInstance(): Marked {
    const renderer = new Renderer();
    renderer.image = this._imageRenderer.bind(this);

    return new Marked(
      markedHighlight({
        highlight: (code) => hljs.highlightAuto(code).value
      }),
      gfmHeadingId(),
      { renderer }
    );
  }

  /**
   * Check if a URL is absolute (should not be transformed).
   * Absolute URLs include: https://, http://, data:, //, assets/, /
   */
  private _isAbsoluteUrl(url: string): boolean {
    return url.startsWith('https://') || url.startsWith('http://') ||
           url.startsWith('data:') || url.startsWith('//') ||
           url.startsWith('assets/') || url.startsWith('/');
  }

  /**
   * Normalize a relative URL by stripping ./ prefix.
   */
  private _normalizeRelativeUrl(url: string): string {
    return url.startsWith('./') ? url.slice(2) : url;
  }

  /**
   * Escape special HTML characters in attribute values.
   */
  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Custom image renderer that transforms relative URLs to absolute URLs.
   * marked v17 uses token-based API: renderer receives a token object.
   *
   * NOTE: In marked v17, the token contains RAW unescaped text.
   * We MUST escape special characters to prevent broken HTML.
   */
  private _imageRenderer(token: Tokens.Image): string {
    let src = token.href;

    if (!this._isAbsoluteUrl(token.href)) {
      src = this.baseUrl + this._normalizeRelativeUrl(token.href);
    }

    const escapedAlt = this._escapeHtml(token.text);
    let out = `<img src="${src}" alt="${escapedAlt}"`;
    if (token.title) {
      out += ` title="${this._escapeHtml(token.title)}"`;
    }
    out += '>';
    return out;
  }

  // Transform relative paths in raw HTML <img> tags to absolute URLs
  // Supports both double quotes (src="...") and single quotes (src='...')
  private _transformRelativeImagePaths(html: string): string {
    return html.replace(/<img([^>]*)\ssrc=(["'])([^"']+)\2/g, (match, attrs, quote, src) => {
      if (this._isAbsoluteUrl(src)) {
        return match;
      }
      return `<img${attrs} src=${quote}${this.baseUrl}${this._normalizeRelativeUrl(src)}${quote}`;
    });
  }

  private separate(jekyllMarkdown: string): {
    markdown: string;
    yaml: string;
  } {
    // BUG FIX: Original had '\s' which becomes literal 's' in string context.
    // Using '[ \\t]*' (space/tab only) instead of '\\s*' to avoid matching newlines,
    // which would change behavior when there's a blank line after the separator.
    const re = new RegExp('^---[ \\t]*$\\r?\\n', 'm');
    const m1 = jekyllMarkdown.match(re); // first separator

    if (m1 === null) {
      return { markdown: jekyllMarkdown, yaml: '' };
    }

    const s1 = jekyllMarkdown.substring((m1.index ?? 0) + m1[0].length);
    const m2 = s1.match(re); // second separator

    if (m2 === null) {
      return { markdown: jekyllMarkdown, yaml: '' };
    }

    const yaml = s1.substring(0, m2.index);
    const markdown = s1.substring((m2.index ?? 0) + m2[0].length);
    return { markdown, yaml };
  }

  private compileMarkdown(markdown: string): string {
    const html = this.marked.parse(markdown) as string;
    return this._transformRelativeImagePaths(html);
  }

  private parseYaml(yaml: string): any {
    return load(yaml);
  }

  public parse(jekyllMarkdown: string): {
    html: string;
    yaml: string;
    parsedYaml: any;
    markdown: string;
  } {
    const { yaml, markdown } = this.separate(jekyllMarkdown);
    const parsedYaml = this.parseYaml(yaml);
    const html = this.compileMarkdown(markdown);

    return {
      html,
      markdown,
      parsedYaml,
      yaml
    };
  }
}
