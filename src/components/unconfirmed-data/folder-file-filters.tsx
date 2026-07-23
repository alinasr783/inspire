"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { getFolders, type Folder } from "@/lib/unconfirmed-folder-actions";
import { FolderFileManager } from "@/components/unconfirmed-data/folder-file-manager";

const selectClass = "appearance-none flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface FolderFileFiltersProps {
  folderId?: string;
  fileId?: string;
}

export function FolderFileFilters({ folderId, fileId }: FolderFileFiltersProps) {
  const t = useTranslations("UnconfirmedData");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFolders();
      setFolders(data);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
      setFolders([]);
    }
    setLoading(false);
  }

  const navigate = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    window.location.href = qs ? `${pathname}?${qs}` : pathname;
  };

  const currentFiles = folders.find((f) => f.id === folderId)?.files ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative">
        <select
          value={folderId ?? "all"}
          onChange={(e) => navigate({ folder: e.target.value === "all" ? null : e.target.value, file: null })}
          className={`${selectClass} pr-7`}
          disabled={loading}
        >
          <option value="all">{t("allFolders")}</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>{folder.name}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      <div className="relative">
        <select
          value={fileId ?? "all"}
          onChange={(e) => navigate({ file: e.target.value === "all" ? null : e.target.value })}
          className={`${selectClass} pr-7`}
          disabled={!folderId || loading}
        >
          <option value="all">{folderId ? t("allFiles") : t("selectFolderFirst")}</option>
          {currentFiles.map((file) => (
            <option key={file.id} value={file.id}>{file.name}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>

      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{t("error")}: {error}</span>
      )}

      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowManager(true)}>
        <Settings2 className="h-3 w-3" />
        {t("manageFolders")}
      </Button>

      <FolderFileManager
        open={showManager}
        onClose={() => { setShowManager(false); loadFolders(); }}
      />
    </div>
  );
}
