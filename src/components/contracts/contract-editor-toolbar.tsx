"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { ARABIC_FONTS, FONT_SIZES } from "./arabic-fonts";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Palette,
  PlusSquare,
  Eye,
  EyeOff,
  ChevronDown,
  Scissors,
} from "lucide-react";

const COLORS = [
  "#000000", "#434343", "#666666", "#999999",
  "#b71c1c", "#d32f2f", "#f44336", "#e57373",
  "#1b5e20", "#2e7d32", "#4caf50", "#81c784",
  "#0d47a1", "#1565c0", "#1976d2", "#64b5f6",
  "#4a148c", "#6a1b9a", "#9c27b0", "#ce93d8",
  "#e65100", "#ef6c00", "#ff9800", "#ffb74d",
];

interface ContractEditorToolbarProps {
  editor: Editor | null;
  isPreview: boolean;
  onTogglePreview: () => void;
  onCreateInput: () => void;
}

export function ContractEditorToolbar({
  editor,
  isPreview,
  onTogglePreview,
  onCreateInput,
}: ContractEditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [activeFont, setActiveFont] = useState<string>("");
  const [activeFontSize, setActiveFontSize] = useState<string>("");

  // Sync toolbar state from editor selection/cursor position
  const fontFamily = editor?.getAttributes("textStyle").fontFamily;
  const fontSize = editor?.getAttributes("textStyle").fontSize;
  const currentFont = typeof fontFamily === "string" && fontFamily ? fontFamily : activeFont;
  const currentFontSize = typeof fontSize === "string" && fontSize ? fontSize : activeFontSize;

  const handleFontChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!editor) return;
      const val = e.target.value;
      if (!val) {
        editor.chain().focus().unsetFontFamily().run();
        setActiveFont("");
      } else {
        editor.chain().focus().setFontFamily(val).run();
        setActiveFont(val);
      }
    },
    [editor]
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!editor) return;
      const val = e.target.value;
      if (!val) {
        editor.chain().focus().unsetFontSize().run();
        setActiveFontSize("");
      } else {
        editor.chain().focus().setFontSize(val).run();
        setActiveFontSize(val);
      }
    },
    [editor]
  );

  const alignParagraph = useCallback(
    (alignment: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { from } = state.selection;
          const $from = state.doc.resolve(from);
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const pos = $from.before(d);
              tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                textAlign: alignment,
              });
              return true;
            }
          }
          return false;
        })
        .run();
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-xl border bg-card p-2 shadow-sm"
      dir="ltr"
    >
      {/* Font Family */}
      <select
        onChange={handleFontChange}
        className="h-8 rounded-lg border bg-background px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        value={currentFont}
      >
        <option value="">الخط</option>
        <optgroup label="─ عصرية ─">
          {ARABIC_FONTS.filter((f) => f.category === "عصرية").map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="─ تقليدية ─">
          {ARABIC_FONTS.filter((f) => f.category === "تقليدية").map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Font Size */}
      <select
        onChange={handleFontSizeChange}
        className="h-8 rounded-lg border bg-background px-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        value={currentFontSize}
      >
        {FONT_SIZES.map((size) => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Bold */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="عريض (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      {/* Italic */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="مائل (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      {/* Underline */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="تسطير (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      {/* Strikethrough */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="يتوسطه خط"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Text Color */}
      <div className="relative" ref={colorPickerRef}>
        <ToolbarButton
          onClick={() => setShowColorPicker(!showColorPicker)}
          active={showColorPicker}
          title="لون النص"
        >
          <Palette className="h-4 w-4" />
          <ChevronDown className="ml-0.5 h-3 w-3" />
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border bg-card p-2 shadow-lg">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground">لون النص</span>
              <button
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="text-[10px] text-primary hover:underline"
              >
                إفتراضي
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded-lg border border-border transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowHighlightPicker(!showHighlightPicker)}
          active={editor.isActive("highlight")}
          title="تمييز النص"
        >
          <Highlighter className="h-4 w-4" />
          <ChevronDown className="ml-0.5 h-3 w-3" />
        </ToolbarButton>
        {showHighlightPicker && (
          <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border bg-card p-2 shadow-lg">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground">لون التمييز</span>
              <button
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
                className="text-[10px] text-primary hover:underline"
              >
                إفتراضي
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded-lg border border-border transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setShowHighlightPicker(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Text Align */}
      <ToolbarButton
        onClick={() => alignParagraph("right")}
        active={editor.isActive({ textAlign: "right" })}
        title="محاذاة لليمين"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => alignParagraph("center")}
        active={editor.isActive({ textAlign: "center" })}
        title="محاذاة للوسط"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => alignParagraph("left")}
        active={editor.isActive({ textAlign: "left" })}
        title="محاذاة لليسار"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="قائمة نقطية"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="قائمة رقمية"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        active={false}
        disabled={!editor.can().undo()}
        title="تراجع (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        active={false}
        disabled={!editor.can().redo()}
        title="إعادة (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Create Input */}
      <ToolbarButton
        onClick={onCreateInput}
        active={false}
        title="إنشاء حقل إدخال (Ctrl+Shift+I)"
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
      >
        <PlusSquare className="h-4 w-4" />
        <span className="ml-1 text-[11px] font-bold">input</span>
      </ToolbarButton>

      {/* Page Break */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setPageBreak().run()}
        active={false}
        title="نهاية صفحة (Ctrl+Enter)"
      >
        <Scissors className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Preview Toggle */}
      <ToolbarButton
        onClick={onTogglePreview}
        active={isPreview}
        title={isPreview ? "الرجوع للتحرير" : "معاينة"}
        className="ml-auto"
      >
        {isPreview ? (
          <>
            <EyeOff className="h-4 w-4" />
            <span className="ml-1 text-[11px]">تحرير</span>
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            <span className="ml-1 text-[11px]">معاينة</span>
          </>
        )}
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 min-w-[32px] items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-medium transition-all duration-150",
        active && !className?.includes("gradient")
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-30",
        className
      )}
    >
      {children}
    </button>
  );
}
