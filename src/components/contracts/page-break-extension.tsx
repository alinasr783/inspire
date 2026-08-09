import { Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "page-break", class: "page-break-node" }, HTMLAttributes),
      ["span", { class: "page-break-label" }, "— نهاية الصفحة —"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent);
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({ type: "pageBreak" })
            .run();
        },
    };
  },
});

function PageBreakComponent({ node, deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="div"
      className={`page-break-node group${selected ? " page-break-selected" : ""}`}
      data-type="page-break"
      onDoubleClick={() => deleteNode()}
    >
      <span className="page-break-line" />
      <span className="page-break-label">— نهاية الصفحة —</span>
      <span className="page-break-line" />
      <button
        className="page-break-delete"
        onClick={() => deleteNode()}
        title="حذف نهاية الصفحة"
      >
        <X size={12} />
      </button>
    </NodeViewWrapper>
  );
}
