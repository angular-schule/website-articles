import { describe, it, expect } from 'vitest';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import hljs from 'highlight.js';
import { JekyllMarkdownParser } from './jekyll-markdown-parser';

/**
 * Create a Marked instance with the same extensions as JekyllMarkdownParser.
 * Used for "raw marked" baseline tests.
 */
function createConfiguredMarked(): Marked {
  return new Marked(
    markedHighlight({
      highlight: (code) => hljs.highlightAuto(code).value
    }),
    gfmHeadingId()
  );
}

/**
 * =============================================================================
 * COMPREHENSIVE TEST BLOG POST
 * =============================================================================
 * This synthetic blog post includes ALL markdown features used in production.
 * It serves as a regression test when upgrading marked or other dependencies.
 *
 * Features covered:
 * - YAML frontmatter
 * - Headings (h1, h2, h3) with auto-generated IDs
 * - Code blocks with syntax highlighting (typescript, html, bash)
 * - Inline code
 * - Images (markdown syntax + raw HTML)
 * - Links (internal + external)
 * - Blockquotes (with nested bold)
 * - Bold and italic text
 * - Unordered lists
 * - Raw HTML (iframe, div, comments)
 * =============================================================================
 */

/**
 * EXPECTED HTML OUTPUT - marked v17
 * ----------------------------------
 * This is the EXACT expected output. Every character must match!
 *
 * BREAKING CHANGE from v4: marked v17 does NOT add newlines after </code></pre>.
 * This is acceptable and documented here.
 */
const EXPECTED_HTML_WITH_IMAGE_TRANSFORM = `<h1 id="main-heading">Main Heading</h1>
<p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
<h2 id="code-examples">Code Examples</h2>
<p>Here is some inline <code>code</code> in a sentence.</p>
<pre><code class="language-typescript">import { Component } from <span class="hljs-string">&#x27;@angular/core&#x27;</span>;

<span class="hljs-variable">@Component</span>({
  selector: <span class="hljs-string">&#x27;app-root&#x27;</span>,
  template: <span class="hljs-string">&#x27;&lt;h1&gt;Hello&lt;/h1&gt;&#x27;</span>
})
export <span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">AppComponent</span> </span>{
  title = <span class="hljs-string">&#x27;test&#x27;</span>;
}
</code></pre><h3 id="html-template">HTML Template</h3>
<pre><code class="language-html">&lt;div <span class="hljs-keyword">class</span>=&quot;<span class="hljs-symbol">container</span>&quot;&gt;
  &lt;<span class="hljs-symbol">p</span>&gt;<span class="hljs-symbol">Hello</span> <span class="hljs-symbol">World</span>&lt;/<span class="hljs-symbol">p</span>&gt;
&lt;/<span class="hljs-symbol">div</span>&gt;
</code></pre><h2 id="images">Images</h2>
<p>Local image: <img src="https://example.com/blog/my-post/screenshot.png" alt="Screenshot"></p>
<p>Image with title: <img src="https://example.com/blog/my-post/logo.png" alt="Logo" title="Company Logo"></p>
<p>External image: <img src="https://example.com/external.png" alt="External"></p>
<h2 id="links">Links</h2>
<p>Check out <a href="https://angular-buch.com/docs">our documentation</a> for more info.</p>
<p>Internal link: <a href="/blog/2023-01-other-post">Another post</a></p>
<h2 id="blockquotes">Blockquotes</h2>
<blockquote>
<p>This is a blockquote with <strong>bold text</strong> inside.
It spans multiple lines.</p>
</blockquote>
<h2 id="lists">Lists</h2>
<ul>
<li>First item</li>
<li>Second item with <code>code</code></li>
<li>Third item</li>
</ul>
<h2 id="raw-html">Raw HTML</h2>
<iframe src="https://stackblitz.com/edit/angular" width="100%" height="500"></iframe>

<div class="custom-box">
  <p>Custom styled content</p>
</div>

<!-- This is an HTML comment -->

<img src="https://example.com/blog/my-post/photo.jpg" alt="Photo" class="rounded" loading="lazy">

<h2 id="fazit">Fazit</h2>
<p>That&#39;s all folks!</p>
`;

/**
 * EXPECTED RAW MARKED OUTPUT - marked v17 with extensions (no custom renderer)
 * ----------------------------------------------------------------------------
 * This shows what marked produces without our image URL transformation.
 *
 * BREAKING CHANGE from v4: marked v17 does NOT add newlines after </code></pre>.
 * This is acceptable and documented here.
 */
const EXPECTED_RAW_MARKED_HTML = `<h1 id="main-heading">Main Heading</h1>
<p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
<h2 id="code-examples">Code Examples</h2>
<p>Here is some inline <code>code</code> in a sentence.</p>
<pre><code class="language-typescript">import { Component } from <span class="hljs-string">&#x27;@angular/core&#x27;</span>;

<span class="hljs-variable">@Component</span>({
  selector: <span class="hljs-string">&#x27;app-root&#x27;</span>,
  template: <span class="hljs-string">&#x27;&lt;h1&gt;Hello&lt;/h1&gt;&#x27;</span>
})
export <span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">AppComponent</span> </span>{
  title = <span class="hljs-string">&#x27;test&#x27;</span>;
}
</code></pre><h3 id="html-template">HTML Template</h3>
<pre><code class="language-html">&lt;div <span class="hljs-keyword">class</span>=&quot;<span class="hljs-symbol">container</span>&quot;&gt;
  &lt;<span class="hljs-symbol">p</span>&gt;<span class="hljs-symbol">Hello</span> <span class="hljs-symbol">World</span>&lt;/<span class="hljs-symbol">p</span>&gt;
&lt;/<span class="hljs-symbol">div</span>&gt;
</code></pre><h2 id="images">Images</h2>
<p>Local image: <img src="screenshot.png" alt="Screenshot"></p>
<p>Image with title: <img src="./logo.png" alt="Logo" title="Company Logo"></p>
<p>External image: <img src="https://example.com/external.png" alt="External"></p>
<h2 id="links">Links</h2>
<p>Check out <a href="https://angular-buch.com/docs">our documentation</a> for more info.</p>
<p>Internal link: <a href="/blog/2023-01-other-post">Another post</a></p>
<h2 id="blockquotes">Blockquotes</h2>
<blockquote>
<p>This is a blockquote with <strong>bold text</strong> inside.
It spans multiple lines.</p>
</blockquote>
<h2 id="lists">Lists</h2>
<ul>
<li>First item</li>
<li>Second item with <code>code</code></li>
<li>Third item</li>
</ul>
<h2 id="raw-html">Raw HTML</h2>
<iframe src="https://stackblitz.com/edit/angular" width="100%" height="500"></iframe>

<div class="custom-box">
  <p>Custom styled content</p>
</div>

<!-- This is an HTML comment -->

<img src="photo.jpg" alt="Photo" class="rounded" loading="lazy">

<h2 id="fazit">Fazit</h2>
<p>That&#39;s all folks!</p>
`;

const COMPREHENSIVE_BLOG_POST = `---
title: "Comprehensive Test Post"
author: Test Author
mail: test@example.com
published: 2024-01-15
keywords:
  - Angular
  - Test
language: de
header: header.jpg
---

# Main Heading

This is a paragraph with **bold text** and *italic text*.

## Code Examples

Here is some inline \`code\` in a sentence.

\`\`\`typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<h1>Hello</h1>'
})
export class AppComponent {
  title = 'test';
}
\`\`\`

### HTML Template

\`\`\`html
<div class="container">
  <p>Hello World</p>
</div>
\`\`\`

## Images

Local image: ![Screenshot](screenshot.png)

Image with title: ![Logo](./logo.png "Company Logo")

External image: ![External](https://example.com/external.png)

## Links

Check out [our documentation](https://angular-buch.com/docs) for more info.

Internal link: [Another post](/blog/2023-01-other-post)

## Blockquotes

> This is a blockquote with **bold text** inside.
> It spans multiple lines.

## Lists

- First item
- Second item with \`code\`
- Third item

## Raw HTML

<iframe src="https://stackblitz.com/edit/angular" width="100%" height="500"></iframe>

<div class="custom-box">
  <p>Custom styled content</p>
</div>

<!-- This is an HTML comment -->

<img src="photo.jpg" alt="Photo" class="rounded" loading="lazy">

## Fazit

That's all folks!
`;

/**
 * Extract the markdown body from COMPREHENSIVE_BLOG_POST (without YAML frontmatter).
 * This avoids duplicating the markdown content in tests.
 */
function getMarkdownBody(jekyllMarkdown: string): string {
  const lines = jekyllMarkdown.split('\n');
  let separatorCount = 0;
  let startIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++;
      if (separatorCount === 2) {
        startIndex = i + 1;
        break;
      }
    }
  }

  return lines.slice(startIndex).join('\n');
}

/**
 * =============================================================================
 * CONFIGURED MARKED BEHAVIOR (with extensions, without our image transform)
 * =============================================================================
 * These tests document what marked does with our configured extensions
 * (gfmHeadingId, marked-highlight) but WITHOUT our custom image renderer.
 * If these fail after a marked upgrade, we know marked changed - not our code.
 * =============================================================================
 */
describe('Configured marked behavior (baseline)', () => {
  const marked = createConfiguredMarked();

  it('should generate heading IDs automatically', () => {
    const html = marked.parse('# Hello World\n\n## Code Examples\n\n### Sub Section');

    expect(html).toContain('<h1 id="hello-world">Hello World</h1>');
    expect(html).toContain('<h2 id="code-examples">Code Examples</h2>');
    expect(html).toContain('<h3 id="sub-section">Sub Section</h3>');
  });

  it('should handle special characters in heading IDs', () => {
    const html = marked.parse('## Über uns\n\n## FAQ & Hilfe\n\n## C++ Guide');

    expect(html).toContain('id="über-uns"');
    expect(html).toContain('id="faq--hilfe"');
    expect(html).toContain('id="c-guide"');
  });

  it('should apply syntax highlighting to code blocks', () => {
    const html = marked.parse('```typescript\nconst x = 1;\n```');

    expect(html).toContain('<pre><code class="language-typescript">');
    expect(html).toContain('hljs-'); // highlight.js adds classes
  });

  it('should escape HTML in code blocks', () => {
    const html = marked.parse('```html\n<div class="test">Hello</div>\n```');

    expect(html).toContain('&lt;div');
    expect(html).toContain('&gt;');
  });

  it('should render inline code', () => {
    const html = marked.parse('Use `npm install` to install.');

    expect(html).toContain('<code>npm install</code>');
  });

  it('should render bold and italic', () => {
    const html = marked.parse('This is **bold** and *italic*.');

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('should render links', () => {
    const html = marked.parse('[Click here](https://example.com)');

    expect(html).toContain('<a href="https://example.com">Click here</a>');
  });

  it('should render blockquotes', () => {
    const html = marked.parse('> This is a quote\n> with **bold**');

    expect(html).toContain('<blockquote>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('</blockquote>');
  });

  it('should render unordered lists', () => {
    const html = marked.parse('- Item 1\n- Item 2\n- Item 3');

    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
    expect(html).toContain('</ul>');
  });

  it('should pass through raw HTML', () => {
    const html = marked.parse('<div class="custom">Content</div>\n\n<iframe src="x"></iframe>');

    expect(html).toContain('<div class="custom">Content</div>');
    expect(html).toContain('<iframe src="x"></iframe>');
  });

  it('should preserve HTML comments', () => {
    const html = marked.parse('<!-- comment -->\n\nText');

    expect(html).toContain('<!-- comment -->');
  });

  it('should render images with default src (no transformation)', () => {
    const html = marked.parse('![Alt](image.png "Title")');

    // Default marked behavior: src is unchanged
    expect(html).toContain('src="image.png"');
    expect(html).toContain('alt="Alt"');
    expect(html).toContain('title="Title"');
  });

  /**
   * CONFIGURED MARKED CHARACTER-BY-CHARACTER TEST
   * ---------------------------------------------
   * This captures marked output WITH extensions but WITHOUT our image transform.
   * If this fails after a marked upgrade but JekyllMarkdownParser tests pass,
   * our code successfully compensated for marked changes.
   */
  it('should produce EXACT raw marked output (character-by-character)', () => {
    // Extract markdown body from COMPREHENSIVE_BLOG_POST (without YAML)
    const rawMarkdown = getMarkdownBody(COMPREHENSIVE_BLOG_POST);

    const html = marked.parse(rawMarkdown);
    expect(html).toBe(EXPECTED_RAW_MARKED_HTML);
  });
});

/**
 * =============================================================================
 * JEKYLL MARKDOWN PARSER MODIFICATIONS
 * =============================================================================
 * These tests document what OUR code adds on top of marked.
 * If raw marked tests pass but these fail, our code broke something.
 * =============================================================================
 */
describe('JekyllMarkdownParser', () => {
  const baseUrl = 'https://example.com/blog/my-post/';

  describe('Comprehensive regression test (marked upgrade safety)', () => {
    /**
     * This test ensures ALL features work correctly after a marked upgrade.
     * If this test fails, the upgrade broke something important!
     */
    it('should produce expected output for comprehensive blog post', () => {
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(COMPREHENSIVE_BLOG_POST);

      // === YAML Frontmatter ===
      expect(result.parsedYaml.title).toBe('Comprehensive Test Post');
      expect(result.parsedYaml.author).toBe('Test Author');

      // === Headings with IDs (CRITICAL - used for anchor links!) ===
      expect(result.html).toContain('<h1 id="main-heading">Main Heading</h1>');
      expect(result.html).toContain('<h2 id="code-examples">Code Examples</h2>');
      expect(result.html).toContain('<h3 id="html-template">HTML Template</h3>');
      expect(result.html).toContain('<h2 id="images">Images</h2>');
      expect(result.html).toContain('<h2 id="links">Links</h2>');
      expect(result.html).toContain('<h2 id="blockquotes">Blockquotes</h2>');
      expect(result.html).toContain('<h2 id="lists">Lists</h2>');
      expect(result.html).toContain('<h2 id="raw-html">Raw HTML</h2>');
      expect(result.html).toContain('<h2 id="fazit">Fazit</h2>');

      // === Bold and Italic ===
      expect(result.html).toContain('<strong>bold text</strong>');
      expect(result.html).toContain('<em>italic text</em>');

      // === Inline code ===
      expect(result.html).toContain('<code>code</code>');

      // === Code blocks with syntax highlighting ===
      expect(result.html).toContain('<pre><code class="language-typescript">');
      expect(result.html).toContain('<pre><code class="language-html">');
      expect(result.html).toContain('hljs-'); // highlight.js classes

      // === Images with URL transformation ===
      expect(result.html).toContain(`src="${baseUrl}screenshot.png"`);
      expect(result.html).toContain(`src="${baseUrl}logo.png"`);
      expect(result.html).toContain('title="Company Logo"');
      expect(result.html).toContain('src="https://example.com/external.png"'); // external unchanged

      // === Links ===
      expect(result.html).toContain('<a href="https://angular-buch.com/docs">our documentation</a>');
      expect(result.html).toContain('<a href="/blog/2023-01-other-post">Another post</a>');

      // === Blockquotes ===
      expect(result.html).toContain('<blockquote>');
      expect(result.html).toContain('</blockquote>');

      // === Lists ===
      expect(result.html).toContain('<ul>');
      expect(result.html).toContain('<li>First item</li>');
      expect(result.html).toContain('<li>Second item with <code>code</code></li>');

      // === Raw HTML pass-through ===
      expect(result.html).toContain('<iframe src="https://stackblitz.com/edit/angular"');
      expect(result.html).toContain('<div class="custom-box">');
      expect(result.html).toContain('<!-- This is an HTML comment -->');

      // === Raw HTML img with URL transformation ===
      expect(result.html).toContain(`src="${baseUrl}photo.jpg"`);
      expect(result.html).toContain('class="rounded"');
      expect(result.html).toContain('loading="lazy"');
    });

    /**
     * EXACT CHARACTER-BY-CHARACTER COMPARISON
     * ---------------------------------------
     * This test ensures the HTML output matches EXACTLY after any dependency upgrade.
     * The expected HTML was generated with marked v4.3.0.
     *
     * If this test fails after a marked upgrade:
     * 1. Check the diff carefully - every character matters!
     * 2. Decide if the change is acceptable (improvement) or a regression
     * 3. Update EXPECTED_HTML_WITH_IMAGE_TRANSFORM only if the change is intentional
     */
    it('should produce EXACT HTML output (character-by-character)', () => {
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(COMPREHENSIVE_BLOG_POST);

      expect(result.html).toBe(EXPECTED_HTML_WITH_IMAGE_TRANSFORM);
    });
  });

  describe('parse()', () => {
    it('should parse markdown with YAML frontmatter', () => {
      const input = `---
title: Test Post
author: John Doe
---

# Hello World

This is a test.
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.parsedYaml.title).toBe('Test Post');
      expect(result.parsedYaml.author).toBe('John Doe');
      expect(result.html).toContain('<h1 id="hello-world">Hello World</h1>');
      expect(result.html).toContain('<p>This is a test.</p>');
      expect(result.markdown).toBe('\n# Hello World\n\nThis is a test.\n');
    });

    it('should handle markdown without frontmatter', () => {
      const input = '# Just Markdown\n\nNo frontmatter here.';
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.parsedYaml).toBeUndefined();
      expect(result.html).toContain('<h1 id="just-markdown">Just Markdown</h1>');
      expect(result.html).toContain('<p>No frontmatter here.</p>');
      expect(result.markdown).toBe(input);
    });
  });

  describe('Markdown images (![](...))', () => {
    it('should transform markdown images to absolute URLs', () => {
      const input = `---
title: Test
---

![Alt text](image.png)
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}image.png"`);
      expect(result.html).toContain('alt="Alt text"');
    });

    it('should include title attribute if provided', () => {
      const input = `---
title: Test
---

![Alt text](image.png "Image Title")
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('title="Image Title"');
      expect(result.html).toContain(`src="${baseUrl}image.png"`);
      expect(result.html).toContain('alt="Alt text"');
    });

    it('should NOT transform markdown images with http URLs', () => {
      const input = `---
title: Test
---

![External](https://other.com/image.png)
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="https://other.com/image.png"');
      expect(result.html).not.toContain(baseUrl);
    });

    it('should strip ./ prefix for markdown images', () => {
      const input = `---
title: Test
---

![Alt](./image.png)
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}image.png"`);
      expect(result.html).not.toContain('./');
    });

    it('should NOT transform markdown images with data URIs', () => {
      const input = `---
title: Test
---

![Data](data:image/png;base64,ABC123)
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="data:image/png;base64,ABC123"');
    });

    it('should NOT transform markdown images with asset paths', () => {
      const input = `---
title: Test
---

![Icon](assets/img/icon.svg)
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="assets/img/icon.svg"');
      expect(result.html).not.toContain(baseUrl);
    });
  });

  describe('Raw HTML images (<img>)', () => {
    it('should transform relative paths to absolute URLs', () => {
      const input = `---
title: Test
---

<img src="photo.jpg" alt="Photo">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}photo.jpg"`);
      expect(result.html).toContain('alt="Photo"');
    });

    it('should handle ./ prefix by stripping it', () => {
      const input = `---
title: Test
---

<img src="./photo.jpg" alt="Photo">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}photo.jpg"`);
      expect(result.html).not.toContain('./');
    });

    it('should preserve subdirectory paths', () => {
      const input = `---
title: Test
---

<img src="images/photo.jpg" alt="Photo">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}images/photo.jpg"`);
    });

    it('should NOT transform absolute http URLs', () => {
      const input = `---
title: Test
---

<img src="https://other.com/image.png" alt="External">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="https://other.com/image.png"');
      expect(result.html).not.toContain(baseUrl + 'https://');
    });

    it('should NOT transform protocol-relative URLs', () => {
      const input = `---
title: Test
---

<img src="//cdn.example.com/image.png" alt="CDN">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="//cdn.example.com/image.png"');
      expect(result.html).not.toContain(baseUrl);
    });

    it('should NOT transform data URIs', () => {
      const input = `---
title: Test
---

<img src="data:image/png;base64,ABC123" alt="Data">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="data:image/png;base64,ABC123"');
      expect(result.html).not.toContain(baseUrl);
    });

    it('should NOT transform asset paths', () => {
      const input = `---
title: Test
---

<img src="assets/img/icon.svg" alt="Icon">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="assets/img/icon.svg"');
      expect(result.html).not.toContain(baseUrl + 'assets/');
    });

    it('should NOT transform absolute paths starting with /', () => {
      const input = `---
title: Test
---

<img src="/images/logo.png" alt="Logo">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('src="/images/logo.png"');
      expect(result.html).not.toContain(baseUrl + '/');
    });

    it('should preserve other attributes in correct order', () => {
      const input = `---
title: Test
---

<img src="photo.jpg" alt="Photo" width="300" class="rounded">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}photo.jpg"`);
      expect(result.html).toContain('alt="Photo"');
      expect(result.html).toContain('width="300"');
      expect(result.html).toContain('class="rounded"');
    });

    it('should transform multiple images in one document', () => {
      const input = `---
title: Test
---

<img src="first.jpg" alt="First">
<img src="second.jpg" alt="Second">
<img src="https://external.com/third.jpg" alt="Third">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}first.jpg"`);
      expect(result.html).toContain(`src="${baseUrl}second.jpg"`);
      expect(result.html).toContain('src="https://external.com/third.jpg"');
    });

    it('should transform single-quoted src attributes', () => {
      const input = `---
title: Test
---

<img src='photo.jpg' alt='Photo'>
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src='${baseUrl}photo.jpg'`);
      expect(result.html).toContain("alt='Photo'");
    });

    it('should NOT transform single-quoted absolute URLs', () => {
      const input = `---
title: Test
---

<img src='https://example.com/external.png' alt='External'>
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain("src='https://example.com/external.png'");
      expect(result.html).not.toContain(baseUrl);
    });
  });

  describe('HTML pass-through (trusted content)', () => {
    // INTENTIONAL BEHAVIOR: We trust markdown content from our own repository.
    // Raw HTML in the document body is passed through unescaped.
    // This allows rich formatting like <mark>, <abbr>, custom divs, etc.
    // Note: marked escapes HTML in alt/title attributes for safety.

    it('should allow inline HTML elements in markdown', () => {
      const input = `---
title: Test
---

This has <mark>highlighted</mark> text and <abbr title="HyperText Markup Language">HTML</abbr>.
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('<mark>highlighted</mark>');
      expect(result.html).toContain('<abbr title="HyperText Markup Language">HTML</abbr>');
    });

    it('should allow block-level HTML elements', () => {
      const input = `---
title: Test
---

<div class="custom-box">
  <p>Custom styled content</p>
</div>
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('<div class="custom-box">');
      expect(result.html).toContain('<p>Custom styled content</p>');
    });

    it('should preserve raw HTML img tags with all attributes', () => {
      const input = `---
title: Test
---

<img src="photo.jpg" alt="A special image" class="rounded shadow" loading="lazy">
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain('class="rounded shadow"');
      expect(result.html).toContain('loading="lazy"');
    });
  });

  describe('Code blocks', () => {
    it('should NOT transform img tags inside code blocks', () => {
      const input = `---
title: Test
---

\`\`\`html
<img src="example.png" alt="Example">
\`\`\`
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      // Code is escaped and syntax-highlighted by highlight.js
      expect(result.html).toContain('&lt;img');
      expect(result.html).toContain('hljs-attribute');
      expect(result.html).toContain('example.png');
      expect(result.html).not.toContain(`src="${baseUrl}example.png"`);
    });

    it('should transform img outside code block but not inside', () => {
      const input = `---
title: Test
---

<img src="real-image.jpg" alt="Real">

\`\`\`html
<img src="code-example.png" alt="Code">
\`\`\`
`;
      const parser = new JekyllMarkdownParser(baseUrl);
      const result = parser.parse(input);

      expect(result.html).toContain(`src="${baseUrl}real-image.jpg"`);
      expect(result.html).not.toContain(`src="${baseUrl}code-example.png"`);
    });
  });

  /**
   * =============================================================================
   * EDGE CASE TESTS
   * =============================================================================
   * These tests cover edge cases that could break the parser.
   * =============================================================================
   */
  describe('Edge cases', () => {
    describe('http:// URLs (not just https://)', () => {
      it('should NOT transform markdown images with http:// URLs', () => {
        const input = `---
title: Test
---

![HTTP Image](http://insecure.com/image.png)
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.html).toContain('src="http://insecure.com/image.png"');
        expect(result.html).not.toContain(baseUrl);
      });

      it('should NOT transform raw HTML images with http:// URLs', () => {
        const input = `---
title: Test
---

<img src="http://insecure.com/image.png" alt="HTTP">
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.html).toContain('src="http://insecure.com/image.png"');
        expect(result.html).not.toContain(baseUrl);
      });
    });

    describe('Special characters in alt/title', () => {
      it('should escape quotes in alt text', () => {
        const input = `---
title: Test
---

![He said "hello"](image.png)
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        // Quotes should be escaped to prevent broken HTML
        expect(result.html).toContain('alt="He said &quot;hello&quot;"');
        expect(result.html).not.toContain('alt="He said "hello""');
      });

      it('should NOT parse image when title contains unescaped quotes (markdown limitation)', () => {
        // NOTE: This documents a markdown syntax limitation.
        // You cannot have raw quotes inside a quoted title string.
        // Markdown: ![Alt](image.png "Title with "quotes"")
        // This is NOT valid markdown - marked won't parse it as an image!
        const input = `---
title: Test
---

![Alt](image.png "Title with "quotes"")
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        // Marked does NOT parse this as an image - it becomes literal text
        expect(result.html).not.toContain('<img');
        expect(result.html).toContain('![Alt]');
      });

      it('should escape angle brackets in alt text', () => {
        const input = `---
title: Test
---

![Array<string>](image.png)
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.html).toContain('alt="Array&lt;string&gt;"');
      });

      it('should escape ampersands in alt text', () => {
        const input = `---
title: Test
---

![Tom & Jerry](image.png)
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.html).toContain('alt="Tom &amp; Jerry"');
      });
    });

    describe('YAML frontmatter edge cases', () => {
      it('should handle Windows line endings (CRLF)', () => {
        const input = '---\r\ntitle: Test\r\n---\r\n\r\n# Hello';
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.parsedYaml.title).toBe('Test');
        expect(result.html).toContain('<h1');
        expect(result.html).toContain('Hello');
      });

      it('should handle only one separator (no valid frontmatter)', () => {
        const input = '---\nThis is not YAML, just a horizontal rule\n\n# Hello';
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        // Should treat as plain markdown, no YAML parsed
        expect(result.parsedYaml).toBeUndefined();
        expect(result.markdown).toBe(input);
      });

      it('should handle --- inside markdown content (after frontmatter)', () => {
        const input = `---
title: Test
---

# Hello

---

This is after a horizontal rule.
`;
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.parsedYaml.title).toBe('Test');
        // The --- inside content becomes <hr>
        expect(result.html).toContain('<hr');
      });

      it('should handle trailing whitespace after --- separator', () => {
        const input = '---   \ntitle: Test\n---\t\n\n# Hello';
        const parser = new JekyllMarkdownParser(baseUrl);
        const result = parser.parse(input);

        expect(result.parsedYaml.title).toBe('Test');
        expect(result.html).toContain('Hello');
      });
    });

    describe('baseUrl edge cases', () => {
      it('should work correctly when baseUrl has no trailing slash', () => {
        const baseUrlNoSlash = 'https://example.com/blog/my-post';
        const input = `---
title: Test
---

![Alt](image.png)
`;
        const parser = new JekyllMarkdownParser(baseUrlNoSlash);
        const result = parser.parse(input);

        // Without trailing slash, path gets concatenated directly
        // This documents current behavior (may or may not be desired)
        expect(result.html).toContain('src="https://example.com/blog/my-postimage.png"');
      });

      it('should work correctly when baseUrl has trailing slash', () => {
        const baseUrlWithSlash = 'https://example.com/blog/my-post/';
        const input = `---
title: Test
---

![Alt](image.png)
`;
        const parser = new JekyllMarkdownParser(baseUrlWithSlash);
        const result = parser.parse(input);

        expect(result.html).toContain('src="https://example.com/blog/my-post/image.png"');
      });
    });
  });
});
