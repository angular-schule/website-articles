import { load } from 'js-yaml';
import { marked } from 'marked';
import hljs from 'highlight.js';

// Synchronous highlighting with highlight.js
marked.setOptions({
  highlight: code => hljs.highlightAuto(code).value
});

// original from: https://github.com/bouzuya/jekyll-markdown-parser/blob/master/src/index.ts
export class JekyllMarkdownParser {

  constructor(private baseUrl: string) {}

  private _imageRenderer(href: string, title: string, text: string) {
    let out = `<img src="${this.baseUrl + href}" alt="${text}"`;
    if (title) {
      out += ' title="' + title + '"';
    }
    out += '>';
    return out;
  };

  private getMarkdownRenderer() {
    const renderer = new marked.Renderer();
    renderer.image = this._imageRenderer.bind(this);
    return renderer;
  }

  private separate(jekyllMarkdown: string): {
    markdown: string;
    yaml: string;
  } {
    const re = new RegExp('^---\s*$\r?\n', 'm');
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
    const renderer = this.getMarkdownRenderer();
    return marked(markdown, { renderer: renderer });
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
