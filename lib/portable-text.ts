import type {
  PortableContent,
  PortableTableBlock,
  PortableTextBlock,
} from "@/types";
import { shortId } from "@/lib/utils";

type Span = PortableTextBlock["children"][number];
type MarkDef = PortableTextBlock["markDefs"][number];

function span(text: string, marks: string[] = []): Span {
  return { _type: "span", _key: shortId(), text, marks };
}

function parseInline(text: string): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];
  let i = 0;
  let buffer = "";
  const flushBuffer = (marks: string[] = []) => {
    if (!buffer) return;
    children.push(span(buffer, marks));
    buffer = "";
  };

  while (i < text.length) {
    const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      flushBuffer();
      const key = shortId();
      markDefs.push({ _type: "link", _key: key, href: linkMatch[2] });
      children.push(span(linkMatch[1], [key]));
      i += linkMatch[0].length;
      continue;
    }
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flushBuffer();
        children.push(span(text.slice(i + 2, end), ["strong"]));
        i = end + 2;
        continue;
      }
    }
    if ((text[i] === "*" || text[i] === "_") && text[i + 1] !== text[i]) {
      const delim = text[i];
      const end = text.indexOf(delim, i + 1);
      if (end !== -1 && end > i + 1) {
        flushBuffer();
        children.push(span(text.slice(i + 1, end), ["em"]));
        i = end + 1;
        continue;
      }
    }
    buffer += text[i];
    i += 1;
  }
  flushBuffer();
  if (children.length === 0) children.push(span(text));
  return { children, markDefs };
}

function block(
  style: PortableTextBlock["style"],
  text: string,
  opts: Partial<Pick<PortableTextBlock, "listItem" | "level">> = {},
): PortableTextBlock {
  const { children, markDefs } = parseInline(text);
  return {
    _type: "block",
    _key: shortId(),
    style,
    ...opts,
    children,
    markDefs,
  };
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!isTableRow(t)) return false;
  const cells = splitRow(t);
  return cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((c) => c.trim());
}

function tryParseTable(
  lines: string[],
  start: number,
): { block: PortableTableBlock; end: number } | null {
  if (!isTableRow(lines[start])) return null;
  if (start + 1 >= lines.length) return null;
  if (!isTableSeparator(lines[start + 1])) return null;

  const header = splitRow(lines[start]);
  const rows: { _key: string; cells: string[] }[] = [
    { _key: shortId(), cells: header },
  ];
  let i = start + 2;
  while (i < lines.length && isTableRow(lines[i]) && !isTableSeparator(lines[i])) {
    rows.push({ _key: shortId(), cells: splitRow(lines[i]) });
    i += 1;
  }
  return {
    block: { _type: "table", _key: shortId(), rows },
    end: i,
  };
}

function parseInlineTables(text: string): PortableContent[] {
  const out: PortableContent[] = [];
  const pipeIdx = text.indexOf("|");
  if (pipeIdx === -1) {
    out.push(block("normal", text));
    return out;
  }
  const rawRows = text.split(/\s(?=\|[^|]+\|)/);
  const candidate: string[] = [];
  for (const piece of rawRows) {
    if (isTableRow(piece.trim())) candidate.push(piece.trim());
  }
  if (candidate.length < 3 || !isTableSeparator(candidate[1])) {
    out.push(block("normal", text));
    return out;
  }
  const header = splitRow(candidate[0]);
  const rows: { _key: string; cells: string[] }[] = [
    { _key: shortId(), cells: header },
  ];
  for (let i = 2; i < candidate.length; i += 1) {
    if (!isTableSeparator(candidate[i])) {
      rows.push({ _key: shortId(), cells: splitRow(candidate[i]) });
    }
  }
  out.push({ _type: "table", _key: shortId(), rows });
  return out;
}

export function markdownToPortableText(md: string): PortableContent[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: PortableContent[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const joined = paragraph.join(" ").trim();
    paragraph = [];
    if (joined.includes("|") && joined.match(/\|[^|]+\|/)) {
      const pieces = parseInlineTables(joined);
      blocks.push(...pieces);
      return;
    }
    blocks.push(block("normal", joined));
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx];
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    if (isTableRow(line)) {
      const parsed = tryParseTable(lines, idx);
      if (parsed) {
        flushParagraph();
        blocks.push(parsed.block);
        idx = parsed.end - 1;
        continue;
      }
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

function renderChildren(b: PortableTextBlock): string {
  const linkMap = new Map<string, string>();
  for (const def of b.markDefs) {
    if (def._type === "link" && def.href) linkMap.set(def._key, def.href);
  }
  return b.children
    .map((c) => {
      let out = c.text;
      if (c.marks.includes("strong")) out = `**${out}**`;
      if (c.marks.includes("em")) out = `*${out}*`;
      for (const m of c.marks) {
        const href = linkMap.get(m);
        if (href) out = `[${out}](${href})`;
      }
      return out;
    })
    .join("");
}

function renderTableToMarkdown(t: PortableTableBlock): string {
  if (!t.rows.length) return "";
  const [header, ...body] = t.rows;
  const head = `| ${header.cells.join(" | ")} |`;
  const sep = `| ${header.cells.map(() => "---").join(" | ")} |`;
  const rows = body.map((r) => `| ${r.cells.join(" | ")} |`);
  return [head, sep, ...rows].join("\n");
}

export function renderPortableTextToMarkdown(blocks: PortableContent[]): string {
  return blocks
    .map((b) => {
      if (b._type === "table") return renderTableToMarkdown(b);
      const text = renderChildren(b);
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
