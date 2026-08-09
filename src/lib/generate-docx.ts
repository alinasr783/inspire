import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  PageBreak as DocxPageBreak,
  convertInchesToTwip,
} from "docx";

interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

const FONT_MAP: Record<string, string> = {
  "Cairo, sans-serif": "Cairo",
  "Amiri, serif": "Amiri",
  "Reem Kufi, sans-serif": "Reem Kufi",
  "Aref Ruqaa, serif": "Aref Ruqaa",
  "El Messiri, sans-serif": "El Messiri",
  "Scheherazade New, serif": "Scheherazade New",
  "Noto Naskh Arabic, serif": "Noto Naskh Arabic",
  "Lateef, serif": "Lateef",
};

function getAlign(align?: unknown) {
  const a = String(align ?? "");
  switch (a) {
    case "left":
      return AlignmentType.LEFT;
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    default:
      return AlignmentType.RIGHT;
  }
}

function resolveFont(
  defaultFont: string,
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
): string {
  if (!marks) return defaultFont;
  for (const mark of marks) {
    if (mark.type === "textStyle" && mark.attrs?.fontFamily) {
      const ff = String(mark.attrs.fontFamily);
      return FONT_MAP[ff] || ff;
    }
  }
  return defaultFont;
}

function resolveFontSize(
  defaultSize: number,
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
): number {
  if (!marks) return defaultSize;
  for (const mark of marks) {
    if (mark.type === "textStyle" && mark.attrs?.fontSize) {
      const val = String(mark.attrs.fontSize).replace(/pt/i, "").trim();
      const n = parseInt(val, 10);
      if (!isNaN(n)) return n * 2; // pt -> half-points (docx convention)
    }
  }
  return defaultSize;
}

function resolveColor(
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
): string | undefined {
  if (!marks) return undefined;
  for (const mark of marks) {
    if (mark.type === "textStyle" && mark.attrs?.color) {
      const c = String(mark.attrs.color).replace("#", "");
      if (/^[0-9a-fA-F]{6}$/.test(c)) return c;
    }
  }
  return undefined;
}

function resolveHighlight(
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
): string | undefined {
  if (!marks) return undefined;
  for (const mark of marks) {
    if (mark.type === "highlight" && mark.attrs?.color) {
      const c = String(mark.attrs.color).replace("#", "");
      if (/^[0-9a-fA-F]{6}$/.test(c)) return c;
    }
  }
  return undefined;
}

function extractInputs(obj: unknown): string[] {
  const names: string[] = [];
  if (!obj || typeof obj !== "object") return names;

  const node = obj as Record<string, unknown>;

  // Check marks on text nodes for inputField mark
  if (node.marks && Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (mark && typeof mark === "object") {
        const m = mark as Record<string, unknown>;
        if (m.type === "inputField") {
          // Extract name from text content (format: [NAME])
          const text = typeof node.text === "string" ? node.text : "";
          const name = text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1) : text;
          if (name.trim()) {
            names.push(name.trim());
          }
        }
      }
    }
  }

  // Walk content arrays recursively
  if (Array.isArray(node.content)) {
    for (let i = 0; i < node.content.length; i++) {
      names.push(...extractInputs(node.content[i]));
    }
  }

  return names;
}

export function extractInputFieldNames(
  tiptapJson: Record<string, unknown>
): string[] {
  if (!tiptapJson) return [];

  // Primary strategy: recursive walk
  const walked = extractInputs(tiptapJson);
  if (walked.length > 0) return walked;

  // Fallback: string-based scan for text nodes with inputField marks
  try {
    const str = JSON.stringify(tiptapJson);
    const found: string[] = [];
    const re = /"text":"\[([^\]]+)\]"[^}]*"type":"inputField"/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      if (m[1].trim() && !found.includes(m[1].trim())) {
        found.push(m[1].trim());
      }
    }
    return found;
  } catch {
    return [];
  }
}

function processTextRun(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number
): TextRun {
  let text = node.text || "";
  let isInputField = false;
  let inputName = "";

  if (node.marks) {
    for (const mark of node.marks) {
      if (mark.type === "inputField") {
        isInputField = true;
        inputName = text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1).trim() : text.trim();
        text = filledData[inputName] || inputName || text;
        break;
      }
    }
  }

  const font = isInputField ? defaultFont : resolveFont(defaultFont, node.marks);
  const fontSize = resolveFontSize(defaultSize, node.marks);
  const color = resolveColor(node.marks);
  const highlight = resolveHighlight(node.marks);

  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;

  if (node.marks) {
    for (const mark of node.marks) {
      if (mark.type === "bold") isBold = true;
      if (mark.type === "italic") isItalic = true;
      if (mark.type === "underline") isUnderline = true;
      if (mark.type === "strike") isStrike = true;
    }
  }

  return new TextRun({
    text,
    font: { name: font },
    size: fontSize,
    bold: isBold || undefined,
    italics: isItalic || undefined,
    underline: isUnderline ? { type: UnderlineType.SINGLE } : isInputField ? { type: UnderlineType.SINGLE } : undefined,
    strike: isStrike || undefined,
    color: isInputField ? (filledData[inputName] ? undefined : "E53E3E") : (color || undefined),
    highlight: (highlight || undefined) as
      | "black"
      | "blue"
      | "cyan"
      | "darkBlue"
      | "darkCyan"
      | "darkGray"
      | "darkGreen"
      | "darkMagenta"
      | "darkRed"
      | "darkYellow"
      | "green"
      | "lightGray"
      | "magenta"
      | "red"
      | "white"
      | "yellow"
      | undefined,
    rightToLeft: true,
  });
}

function processInputFieldRun(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number
): TextRun {
  const attrs = (node.attrs as Record<string, unknown>) || {};
  const name = String(attrs.name || "");
  const value = filledData[name] || "";
  return new TextRun({
    text: value || `[${name}]`,
    font: { name: defaultFont },
    size: defaultSize,
    rightToLeft: true,
    bold: !value || undefined,
    underline: value ? undefined : { type: UnderlineType.SINGLE },
    color: value ? undefined : "E53E3E",
  });
}

function processParagraph(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number
): Paragraph {
  const align = getAlign(node.attrs?.textAlign);
  const runs: TextRun[] = [];

  if (node.content) {
    for (const child of node.content) {
      if (child.type === "text") {
        runs.push(processTextRun(child, filledData, defaultFont, defaultSize));
      } else if (child.type === "hardBreak") {
        runs.push(new TextRun({ break: 1 }));
      }
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: "", rightToLeft: true }));
  }

  return new Paragraph({
    children: runs,
    alignment: align,
    spacing: { after: 180, line: 360 },
  });
}

function processHeading(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number
): Paragraph {
  const level = Math.min((node.attrs?.level as number) || 1, 4);
  const align = getAlign(node.attrs?.textAlign);
  const headingSizes = { 1: 36, 2: 32, 3: 28, 4: 24 };
  const fontSize =
    defaultSize * ([1.8, 1.5, 1.3, 1.1][level - 1] || 1);

  const runs: TextRun[] = [];

  if (node.content) {
    for (const child of node.content) {
      if (child.type === "text") {
        const textRun = processTextRun(child, filledData, defaultFont, fontSize);
        runs.push(textRun);
      }
    }
  }

  return new Paragraph({
    children: runs,
    heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][level - 1],
    alignment: align,
    spacing: { before: 300, after: 180 },
  });
}

function processListItems(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number,
  ordered: boolean
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (!node.content) return paragraphs;

  let counter = 1;
  for (const item of node.content) {
    if (item.type !== "listItem" || !item.content) continue;

    const runs: TextRun[] = [];
    const prefix = ordered ? `${counter}. ` : "• ";
    counter++;

    runs.push(
      new TextRun({
        text: prefix,
        font: { name: defaultFont },
        size: defaultSize,
        rightToLeft: true,
      })
    );

    for (const child of item.content) {
      if (child.type === "paragraph" && child.content) {
        for (const inner of child.content) {
          if (inner.type === "text") {
            runs.push(processTextRun(inner, filledData, defaultFont, defaultSize));
          }
        }
      } else if (child.type === "text") {
        runs.push(processTextRun(child, filledData, defaultFont, defaultSize));
      }
    }

    paragraphs.push(
      new Paragraph({
        children: runs,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 80, line: 320 },
        indent: { left: convertInchesToTwip(0.4) },
      })
    );
  }

  return paragraphs;
}

function processTable(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (!node.content) return paragraphs;

  for (const row of node.content) {
    if (row.type !== "tableRow" || !row.content) continue;

    const cellTexts: string[] = [];
    for (const cell of row.content) {
      if ((cell.type === "tableCell" || cell.type === "tableHeader") && cell.content) {
        const parts: string[] = [];
        for (const child of cell.content) {
          if (child.type === "paragraph" && child.content) {
            for (const inner of child.content) {
              if (inner.type === "text") {
                let text = inner.text || "";
                if (inner.marks) {
                  for (const mark of inner.marks) {
                    if (mark.type === "inputField") {
                      const name = text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1).trim() : text.trim();
                      text = filledData[name] || name || text;
                      break;
                    }
                  }
                }
                parts.push(text);
              }
            }
          }
        }
        cellTexts.push(parts.join(" "));
      }
    }

    if (cellTexts.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cellTexts.join("  │  "),
              font: { name: defaultFont },
              size: defaultSize - 2,
              rightToLeft: true,
            }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  return paragraphs;
}

function processNode(
  node: TiptapNode,
  filledData: Record<string, string>,
  defaultFont: string,
  defaultSize: number
): Paragraph[] {
  if (!node) return [];

  switch (node.type) {
    case "doc": {
      const paragraphs: Paragraph[] = [];
      if (node.content) {
        for (const child of node.content) {
          paragraphs.push(
            ...processNode(child, filledData, defaultFont, defaultSize)
          );
        }
      }
      return paragraphs;
    }
    case "paragraph":
      return [processParagraph(node, filledData, defaultFont, defaultSize)];
    case "heading":
      return [processHeading(node, filledData, defaultFont, defaultSize)];
    case "bulletList":
      return processListItems(node, filledData, defaultFont, defaultSize, false);
    case "orderedList":
      return processListItems(node, filledData, defaultFont, defaultSize, true);
    case "table":
      return processTable(node, filledData, defaultFont, defaultSize);
    case "pageBreak":
      return [new DocxPageBreak() as unknown as Paragraph];
    default:
      return [];
  }
}

export async function generateDocx(
  tiptapJson: Record<string, unknown>,
  filledData: Record<string, string>,
  defaultFontName: string = "Cairo"
): Promise<Blob> {
  const node = tiptapJson as unknown as Record<string, unknown>;
  const meta = node._meta as Record<string, string> | undefined;
  const effectiveFont = FONT_MAP[meta?.defaultFont || ""] || meta?.defaultFont || defaultFontName;
  const metaSize = meta?.defaultFontSize || "";
  const rawSize = parseFloat(metaSize.replace(/pt/i, ""));
  const defaultSize = isNaN(rawSize) ? 24 : rawSize * 2; // 12pt default, pt->half-points

  const paragraphs = processNode(
    tiptapJson as unknown as TiptapNode,
    filledData,
    effectiveFont,
    defaultSize
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })],
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: { name: effectiveFont },
            size: defaultSize,
            rightToLeft: true,
          },
          paragraph: {
            spacing: { after: 180, line: 360 },
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

export function renderTiptapHtml(
  tiptapJson: Record<string, unknown>,
  filledData: Record<string, string>
): string {
  const node = tiptapJson as unknown as TiptapNode;

  function renderNode(n: TiptapNode): string {
    switch (n.type) {
      case "doc": {
        const body = (n.content || []).map(renderNode).join("");
        return `<div dir="rtl" style="direction:rtl;font-family:Cairo,sans-serif;padding:20px;line-height:2">${body}</div>`;
      }
      case "paragraph": {
        const align = n.attrs?.textAlign || "right";
        const children = (n.content || []).map(renderNode).join("");
        return `<p style="text-align:${align};margin-bottom:10px;line-height:2">${children || "&nbsp;"}</p>`;
      }
      case "heading": {
        const level = (n.attrs?.level as number) || 1;
        const align = n.attrs?.textAlign || "right";
        const children = (n.content || []).map(renderNode).join("");
        const sizes = ["28px", "24px", "20px", "18px"];
        return `<h${level} style="text-align:${align};font-size:${sizes[Math.min(level, 4) - 1]};margin-bottom:12px;font-weight:700;line-height:1.6">${children || "&nbsp;"}</h${level}>`;
      }
      case "text": {
        let content = n.text || "";
        if (n.marks) {
          for (const mark of n.marks) {
            if (mark.type === "inputField") {
              const name = content.startsWith("[") && content.endsWith("]") ? content.slice(1, -1).trim() : content.trim();
              const val = filledData[name] || "";
              content = val || name || content;
            }
            if (mark.type === "bold") content = `<strong>${content}</strong>`;
            if (mark.type === "italic") content = `<em>${content}</em>`;
            if (mark.type === "underline") content = `<u>${content}</u>`;
            if (mark.type === "strike") content = `<s>${content}</s>`;
            if (mark.type === "textStyle") {
              let style = "";
              if (mark.attrs?.color) style += `color:${mark.attrs.color};`;
              if (mark.attrs?.fontSize) style += `font-size:${mark.attrs.fontSize};`;
              if (mark.attrs?.fontFamily) style += `font-family:${mark.attrs.fontFamily};`;
              if (style) content = `<span style="${style}">${content}</span>`;
            }
            if (mark.type === "highlight" && mark.attrs?.color) {
              content = `<mark style="background-color:${mark.attrs.color}">${content}</mark>`;
            }
          }
        }
        return content;
      }
      case "hardBreak": {
        return "<br/>";
      }
      case "bulletList":
      case "orderedList": {
        const tag = n.type === "orderedList" ? "ol" : "ul";
        const items = (n.content || [])
          .map((item) => {
            const childContent = (item.content || []).map(renderNode).join("");
            return `<li style="margin-bottom:6px;line-height:1.8">${childContent}</li>`;
          })
          .join("");
        return `<${tag} style="margin-bottom:10px;padding-right:24px">${items}</${tag}>`;
      }
      case "pageBreak": {
        return `<div style="page-break-after:always;display:flex;align-items:center;gap:16px;margin:30px 0;padding:16px;border-top:3px double #d4d4d8;border-bottom:3px double #d4d4d8;text-align:center;background:#fafafa;border-radius:4px"><span style="flex:1;border-top:1px dashed #d4d4d8"></span><span style="font-size:12px;color:#71717a;font-weight:600;font-family:Cairo,sans-serif">— نهاية الصفحة —</span><span style="flex:1;border-top:1px dashed #d4d4d8"></span></div>`;
      }
      default:
        return (n.content || []).map(renderNode).join("");
    }
  }

  let html = renderNode(node);

  // Bulletproof fallback: direct string replace of [KEY] with filled values
  for (const [key, value] of Object.entries(filledData)) {
    if (value) {
      html = html.split(`[${key}]`).join(value);
    }
  }

  return html;
}
