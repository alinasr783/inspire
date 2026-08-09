"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { InputField } from "./input-field-extension";
import { PageBreak } from "./page-break-extension";
import { ContractEditorToolbar } from "./contract-editor-toolbar";
import { GOOGLE_FONTS_URL } from "./arabic-fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customStyle: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FontFamilyExt = Extension.create({
  name: "fontFamily",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) =>
              element.style.fontFamily?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

interface ContractEditorProps {
  initialContent?: Record<string, unknown>;
  onSave?: (content: Record<string, unknown>) => Promise<void>;
  saving?: boolean;
  templateName?: string;
  onNameChange?: (name: string) => void;
}

export function ContractEditor({
  initialContent,
  onSave,
  saving = false,
  templateName = "",
  onNameChange,
}: ContractEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [inputDialogOpen, setInputDialogOpen] = useState(false);
  const [inputName, setInputName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bold: {},
        italic: {},
        strike: {},
      }),
      Placeholder.configure({
        placeholder: "اكتب محتوى العقد هنا...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      TextStyle,
      FontFamilyExt,
      FontSize,
      Color.configure({
        types: ["textStyle"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: true }),
      InputField,
      PageBreak,
    ],
    content: initialContent || {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "right", dir: "rtl" },
          content: [],
        },
      ],
    },
    editorProps: {
      attributes: {
        dir: "rtl",
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[500px] px-8 py-6 leading-relaxed text-foreground",
        style: "direction: rtl;",
      },
    },
    editable: !isPreview,
  });

  useEffect(() => {
    editor?.setEditable(!isPreview);
  }, [isPreview, editor]);

  const handleCreateInput = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to);
      setInputName(selectedText || "");
    } else {
      setInputName("");
    }
    setInputDialogOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [editor]);

  const createInputField = useCallback(
    (name: string) => {
      if (!editor || !name.trim()) return;
      editor.chain().focus().setInputField(name.trim()).run();
    },
    [editor]
  );

  const confirmCreateInput = useCallback(() => {
    if (!inputName.trim() || !editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().run();
    }
    createInputField(inputName.trim());
    setInputDialogOpen(false);
    setInputName("");
  }, [inputName, editor, createInputField]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        handleCreateInput();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        editor?.commands.setPageBreak();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreateInput]);

  function serializeProseMirrorNode(node: ProseMirrorNode): Record<string, unknown> {
  const obj: Record<string, unknown> = { type: node.type.name };

  // Include ALL attrs
  if (node.attrs && Object.keys(node.attrs).length) {
    obj.attrs = { ...node.attrs };
  }

  if (node.isText) {
    obj.text = node.text;
    if (node.marks.length) {
      obj.marks = node.marks.map((m) => {
        const mObj: Record<string, unknown> = { type: m.type.name };
        if (m.attrs && Object.keys(m.attrs).length) {
          mObj.attrs = { ...m.attrs };
        }
        return mObj;
      });
    }
  } else if (node.content?.size) {
    obj.content = [] as Record<string, unknown>[];
    node.content.forEach((child: ProseMirrorNode) => {
      const arr = obj.content as Record<string, unknown>[];
      arr.push(serializeProseMirrorNode(child));
    });
  }

  return obj;
}

const handleSave = useCallback(async () => {
    if (!editor || !onSave) return;
    const json = serializeProseMirrorNode(editor.state.doc);
    const textStyleAttrs = editor.getAttributes("textStyle");
    json._meta = {
      defaultFont: String(textStyleAttrs.fontFamily || ""),
      defaultFontSize: String(textStyleAttrs.fontSize || ""),
    };
    await onSave(json);
  }, [editor, onSave]);

  if (!editor) return null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={GOOGLE_FONTS_URL} rel="stylesheet" />

      <div className="space-y-4">
        {onNameChange && (
          <div className="flex items-center gap-3">
            <Label htmlFor="template-name" className="shrink-0 text-sm font-semibold">
              اسم القالب
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="ادخل اسم القالب..."
              className="max-w-md text-right"
              dir="rtl"
            />
          </div>
        )}

        <ContractEditorToolbar
          editor={editor}
          isPreview={isPreview}
          onTogglePreview={() => setIsPreview((p) => !p)}
          onCreateInput={handleCreateInput}
        />

        <div className="relative rounded-xl border bg-card shadow-lg">
          {isPreview && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 rounded-t-xl border-b bg-amber-500/10 px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-600">وضع المعاينة - غير قابل للتعديل</span>
            </div>
          )}
          <div className={isPreview ? "pt-10" : ""}>
            <EditorContent editor={editor} />
          </div>
        </div>

        {onSave && !isPreview && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "جاري الحفظ..." : "حفظ القالب"}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={inputDialogOpen} onOpenChange={setInputDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إنشاء حقل إدخال</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="input-name" className="block text-right">
                اسم الحقل
              </Label>
              <Input
                ref={inputRef}
                id="input-name"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="مثلاً: اسم الطرف الأول"
                className="text-right"
                dir="rtl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmCreateInput();
                  }
                }}
              />
              <p className="text-right text-xs text-muted-foreground">
                سيظهر هذا الحقل كعنصر تفاعلي في النموذج عند ملء العقد
              </p>
            </div>
          </div>
          <div className="flex flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setInputDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={confirmCreateInput} disabled={!inputName.trim()}>
              إنشاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
