import { describe, expect, it } from "vitest";
import { markdownToHtml, mdxToJs } from "satteri";
import { mermaidMdast, mermaidHast } from "../src/plugin";

const CHART = [
  "graph TD",
  "    A[Start] --> B{Is it working?}",
  "    B -->|Yes| C[Great!]",
  "    B -->|No| D[Debug]",
  "    D --> B",
].join("\n");

const MD = `\`\`\`mermaid\n${CHART}\n\`\`\`\n`;

describe("hast responsive (MD崩れの回帰)", () => {
  it("stroke-width を削らない", async () => {
    const { html } = (await markdownToHtml(MD, {
      mdastPlugins: [mermaidMdast()],
      hastPlugins: [mermaidHast()],
    })) as { html: string };
    // renderer 直出力は stroke-width を含む
    expect(html).toContain("stroke-width");
    // 旧正規表現の残骸が出ないこと
    expect(html).not.toMatch(/stroke- [\w]/);
    expect(html).not.toMatch(/stroke-"|stroke-'/);
  });

  it("root の width/height は除去しつつ style を付与する", async () => {
    const { html } = (await markdownToHtml(MD, {
      mdastPlugins: [mermaidMdast()],
      hastPlugins: [mermaidHast()],
    })) as { html: string };
    const svgTag = html.match(/<svg[^>]*>/)?.[0] ?? "";
    // root width/height は消える（stroke-width は別途温存）
    expect(svgTag).not.toMatch(/\swidth="/);
    expect(svgTag).not.toMatch(/\sheight="/);
    expect(svgTag).toContain("width:100%");
  });

  it("responsive:false では SVG を改変しない", async () => {
    const { html } = (await markdownToHtml(MD, {
      mdastPlugins: [mermaidMdast()],
      hastPlugins: [mermaidHast({ responsive: false })],
    })) as { html: string };
    const svgTag = html.match(/<svg[^>]*>/)?.[0] ?? "";
    expect(svgTag).toMatch(/\swidth="/);
    expect(svgTag).toMatch(/\sheight="/);
  });
});

describe("hast MDX 対応 (MDX非表示の回帰)", () => {
  it("mdxToJs でも SVG 化され空 pre が残らない", async () => {
    const { code } = (await mdxToJs(MD, {
      mdastPlugins: [mermaidMdast()],
      hastPlugins: [mermaidHast()],
      jsxImportSource: "astro",
    })) as { code: string };
    // MDX コンパイル後は JSX（_jsx("svg", ...)）になるためタグ文字列ではassertしない
    // 属性はキャメルケース化される（stroke-width → strokeWidth）
    expect(code).toContain("data-mermaid-ssg");
    expect(code).toContain('"svg"');
    expect(code).toContain("strokeWidth");
    // 空プレースホルダが残っていないこと
    expect(code).not.toMatch(/_jsx\("pre", \{\s*class: "mermaid"/);
  });

  it("MD でも SVG 化される", async () => {
    const { html } = (await markdownToHtml(MD, {
      mdastPlugins: [mermaidMdast()],
      hastPlugins: [mermaidHast()],
    })) as { html: string };
    expect(html).toContain("data-mermaid-ssg");
    expect(html).toContain("<svg");
  });
});
