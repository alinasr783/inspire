import { Mark, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inputField: {
      setInputField: (name: string, fontFamily?: string, fontSize?: string) => ReturnType;
    };
  }
}

export const InputField = Mark.create({
  name: "inputField",

  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-input-name") || "",
      },
      fontFamily: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-input-font") || "",
      },
      fontSize: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-input-size") || "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="input-field"]',
        getAttrs: (element) => ({
          name: element.getAttribute("data-input-name") || "",
          fontFamily: element.getAttribute("data-input-font") || "",
          fontSize: element.getAttribute("data-input-size") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, string>;
    return [
      "span",
      {
        "data-type": "input-field",
        "data-input-name": attrs["data-input-name"] || "",
        "data-input-font": attrs["data-input-font"] || "",
        "data-input-size": attrs["data-input-size"] || "",
        contenteditable: "false",
      },
      0,
    ];
  },

  addCommands() {
    return {
      setInputField:
        (name: string, fontFamily?: string, fontSize?: string) =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          const attrs: Record<string, string> = { name };
          if (fontFamily) attrs.fontFamily = fontFamily;
          if (fontSize) attrs.fontSize = fontSize;
          return chain()
            .deleteRange({ from, to })
            .insertContentAt(from, {
              type: "text",
              text: `[${name}]`,
              marks: [{ type: "inputField", attrs }],
            })
            .run();
        },
    };
  },
});
