import type { PortableContent, PortableTextBlock } from "@/types";

function renderSpans(block: PortableTextBlock) {
  const linkHrefs = new Map<string, string>();
  for (const def of block.markDefs) {
    if (def._type === "link" && def.href) linkHrefs.set(def._key, def.href);
  }
  return block.children.map((child) => {
    let node: React.ReactNode = child.text;
    if (child.marks.includes("strong")) node = <strong key={`s-${child._key}`}>{node}</strong>;
    if (child.marks.includes("em")) node = <em key={`e-${child._key}`}>{node}</em>;
    for (const m of child.marks) {
      const href = linkHrefs.get(m);
      if (href) {
        node = (
          <a key={`a-${child._key}`} href={href} target="_blank" rel="noopener noreferrer">
            {node}
          </a>
        );
      }
    }
    return <span key={child._key}>{node}</span>;
  });
}

export function PortableTextPreview({ blocks }: { blocks: PortableContent[] }) {
  const rendered: React.ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: PortableTextBlock[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const Tag = currentList.type === "bullet" ? "ul" : "ol";
    rendered.push(
      <Tag key={`list-${rendered.length}`}>
        {currentList.items.map((b) => (
          <li key={b._key}>{renderSpans(b)}</li>
        ))}
      </Tag>,
    );
    currentList = null;
  };

  for (const b of blocks) {
    if (b._type === "table") {
      flushList();
      const [header, ...body] = b.rows;
      rendered.push(
        <div key={b._key} className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {header && (
              <thead>
                <tr>
                  {header.cells.map((c, i) => (
                    <th
                      key={i}
                      className="border-b border-neutral-300 bg-neutral-50 px-3 py-2 text-left font-semibold text-neutral-900"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row) => (
                <tr key={row._key}>
                  {row.cells.map((c, i) => (
                    <td
                      key={i}
                      className="border-b border-neutral-200 px-3 py-2 align-top text-neutral-700"
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (b.listItem === "bullet" || b.listItem === "number") {
      if (currentList && currentList.type !== b.listItem) flushList();
      if (!currentList) currentList = { type: b.listItem, items: [] };
      currentList.items.push(b);
      continue;
    }
    flushList();
    const content = renderSpans(b);
    switch (b.style) {
      case "h1":
        rendered.push(<h1 key={b._key}>{content}</h1>);
        break;
      case "h2":
        rendered.push(<h2 key={b._key}>{content}</h2>);
        break;
      case "h3":
        rendered.push(<h3 key={b._key}>{content}</h3>);
        break;
      case "h4":
        rendered.push(<h4 key={b._key}>{content}</h4>);
        break;
      case "blockquote":
        rendered.push(<blockquote key={b._key}>{content}</blockquote>);
        break;
      default:
        rendered.push(<p key={b._key}>{content}</p>);
    }
  }
  flushList();

  return <div className="prose-body">{rendered}</div>;
}
