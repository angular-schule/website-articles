import { describe, it, expect } from 'vitest';
import { JekyllMarkdownParser } from './jekyll-markdown-parser';

describe('JekyllMarkdownParser', () => {
  const baseUrl = 'https://example.com/blog/my-post/';

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
});
