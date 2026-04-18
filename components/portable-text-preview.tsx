import type { PortableTextBlock } from "@/types";

export function PortableTextPreview({ blocks }: { blocks: PortableTextBlock[] }) {
  const rendered: React.ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: PortableTextBlock[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const Tag = currentList.type === "bullet" ? "ul" : "ol";
    rendered.push(
      <Tag key={`list-${rendered.length}`}>
        {currentList.items.map((b) => (
          <li key={b._key}>{b.children.map((c) => c.text).join("")}</li>
        ))}
      </Tag>,
    );
    currentList = null;
  };

  for (const b of blocks) {
    if (b.listItem === "bullet" || b.listItem === "number") {
      if (currentList && currentList.type !== b.listItem) flushList();
      if (!currentList) currentList = { type: b.listItem, items: [] };
      currentList.items.push(b);
      continue;
    }
    flushList();
    const text = b.children.map((c) => c.text).join("");
    switch (b.style) {
      case "h1":
        rendered.push(<h1 key={b._key}>{text}</h1>);
        break;
      case "h2":
        rendered.push(<h2 key={b._key}>{text}</h2>);
        break;
      case "h3":
        rendered.push(<h3 key={b._key}>{text}</h3>);
        break;
      case "h4":
        rendered.push(<h4 key={b._key}>{text}</h4>);
        break;
      case "blockquote":
        rendered.push(<blockquote key={b._key}>{text}</blockquote>);
        break;
      default:
        rendered.push(<p key={b._key}>{text}</p>);
    }
  }
  flushList();

  return <div className="prose-body">{rendered}</div>;
}
