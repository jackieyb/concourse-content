import type { PortableTextBlock } from "@/types";
import { shortId } from "@/lib/utils";

function span(text: string, marks: string[] = []) {
  return { _type: "span" as const, _key: shortId(), text, marks };
}

function block(
  style: PortableTextBlock["style"],
  text: string,
  opts: Partial<Pick<PortableTextBlock, "listItem" | "level">> = {},
): PortableTextBlock {
  return {
    _type: "block",
    _key: shortId(),
    style,
    ...opts,
    children: [span(text)],
    markDefs: [],
  };
}

export function markdownToPortableText(md: string): PortableTextBlock[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: PortableTextBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(block("normal", paragraph.join(" ").trim()));
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushParagraph();
      const level = h[1].length as 1 | 2 | 3 | 4;
      const style = (`h${level}` as PortableTextBlock["style"]);
      blocks.push(block(style, h[2].trim()));
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      blocks.push(block("normal", bullet[1].trim(), { listItem: "bullet", level: 1 }));
      continue;
    }

    const num = line.match(/^\d+[.)]\s+(.+)$/);
    if (num) {
      flushParagraph();
      blocks.push(block("normal", num[1].trim(), { listItem: "number", level: 1 }));
      continue;
    }

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      flushParagraph();
      blocks.push(block("blockquote", quote[1].trim()));
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();

  return blocks;
}

export function renderPortableTextToMarkdown(blocks: PortableTextBlock[]): string {
  return blocks
    .map((b) => {
      const text = b.children.map((c) => c.text).join("");
      if (b.style === "h1") return `# ${text}`;
      if (b.style === "h2") return `## ${text}`;
      if (b.style === "h3") return `### ${text}`;
      if (b.style === "h4") return `#### ${text}`;
      if (b.style === "blockquote") return `> ${text}`;
      if (b.listItem === "bullet") return `- ${text}`;
      if (b.listItem === "number") return `1. ${text}`;
      return text;
    })
    .join("\n\n");
}
