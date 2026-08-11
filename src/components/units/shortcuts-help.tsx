"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const groups = [
  {
    title: "Data",
    titleAr: "البيانات",
    color: "emerald",
    items: [
      { keys: ["Alt", "N"], desc: "New row", descAr: "صف جديد" },
      { keys: ["Alt", "D"], desc: "Copy cell above", descAr: "نسخ الخلية أعلاه" },
    ],
  },
  {
    title: "Highlight",
    titleAr: "التمييز",
    color: "amber",
    items: [
      { keys: ["Alt", "G"], desc: "Green highlight", descAr: "تمييز أخضر – toggle" },
      { keys: ["Alt", "H"], desc: "Red highlight", descAr: "تمييز أحمر – toggle" },
    ],
  },
  {
    title: "Style",
    titleAr: "التنسيق",
    color: "violet",
    items: [
      { keys: ["Alt", "R"], desc: "Row style menu", descAr: "قائمة تنسيق الصف" },
      { keys: ["Alt", "C"], desc: "Column style menu", descAr: "قائمة تنسيق العمود" },
    ],
  },
  {
    title: "Navigation",
    titleAr: "التنقل",
    color: "sky",
    items: [
      { keys: ["←", "→"], desc: "Horizontal scroll", descAr: "تمرير أفقي" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-md border border-b-2 bg-gradient-to-b from-muted/50 to-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)] min-w-[1.75rem]">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const isAr = locale === "ar";

  const content = (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {isAr ? group.titleAr : group.title}
          </p>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <div
                key={item.keys.join("+")}
                className="flex items-center justify-between gap-3 rounded-lg border border-transparent bg-muted/30 px-3 py-2 transition-colors hover:border-border hover:bg-muted/50"
              >
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {isAr ? item.descAr : item.desc}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {item.keys.map((k, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <Kbd>{k === " " ? "Space" : k}</Kbd>
                      {i < item.keys.length - 1 && (
                        <span className="text-[10px] text-muted-foreground/50 font-medium">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const header = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <HelpCircle className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">
          {isAr ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {isAr ? "خصائص" : "Properties"} — {isAr ? "صفحة العقارات" : "Page"}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-1.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border bg-muted/40 text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-muted-foreground/30 hover:shadow-sm"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          {/* Desktop: centered modal */}
          <div className="hidden sm:block">
            <div
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <div className="fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-lg">
              {header}
              <div className="mt-4">
                {content}
              </div>
            </div>
          </div>

          {/* Mobile: bottom sheet */}
          <div className="sm:hidden">
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom rounded-t-2xl border-t border-border bg-card px-4 pb-8 pt-4"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                {header}
                <button
                  onClick={() => setOpen(false)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
              {content}
            </div>
          </div>
        </>
      )}
    </>
  );
}
