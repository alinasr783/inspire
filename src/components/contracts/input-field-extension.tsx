import { Mark, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inputField: {
      setInputField: (name: string) => ReturnType;
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
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="input-field"]',
        getAttrs: (element) => ({
          name: element.getAttribute("data-input-name") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const name = (HTMLAttributes as Record<string, string>)["data-input-name"];
    return [
      "span",
      {
        "data-type": "input-field",
        "data-input-name": name || "",
        contenteditable: "false",
      },
      0,
    ];
  },

  addCommands() {
    return {
      setInputField:
        (name: string) =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          return chain()
            .deleteRange({ from, to })
            .insertContentAt(from, {
              type: "text",
              text: `[${name}]`,
              marks: [{ type: "inputField" }],
            })
            .run();
        },
    };
  },
});
