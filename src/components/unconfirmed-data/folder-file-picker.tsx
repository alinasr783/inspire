"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { getFolders, type Folder } from "@/lib/unconfirmed-folder-actions";
import { FolderFileManager } from "@/components/unconfirmed-data/folder-file-manager";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface FolderFilePickerProps {
  selectedFileId: string | null;
  onSelectFile: (fileId: string | null) => void;
}

export function FolderFilePicker({ selectedFileId, onSelectFile }: FolderFilePickerProps) {
  const t = useTranslations("UnconfirmedData");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [showManager, setShowManager] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = () => {
    getFolders()
      .then((data) => { setFolders(data); setError(null); })
      .catch((err) => { setError(err?.message || "Unknown error"); setFolders([]); });
  };

  const currentFiles = folders.find((f) => f.id === selectedFolderId)?.files ?? [];

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    onSelectFile(null);
  };

  const handleManagerSelect = (fileId: string, fileName: string, folderName: string) => {
    onSelectFile(fileId);
    for (const f of folders) {
      if (f.files.some((file) => file.id === fileId)) {
        setSelectedFolderId(f.id);
        break;
      }
    }
    setShowManager(false);
    loadFolders();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("folder")}</Label>
          <div className="relative">
            <select
              value={selectedFolderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              className={`${selectClass} appearance-none pr-8 cursor-pointer`}
            >
              <option value="">{t("selectFolder")}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t("file")}</Label>
          <div className="relative">
            <select
              value={selectedFileId ?? ""}
              onChange={(e) => onSelectFile(e.target.value || null)}
              className={`${selectClass} appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!selectedFolderId}
            >
              <option value="">{selectedFolderId ? t("selectFile") : t("selectFolderFirst")}</option>
              {currentFiles.map((file) => (
                <option key={file.id} value={file.id}>{file.name}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{t("error")}: {error}</p>
      )}

      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowManager(true)}>
        <Settings2 className="h-4 w-4" />
        {t("manageFolders")}
      </Button>

      <FolderFileManager
        open={showManager}
        onClose={() => { setShowManager(false); loadFolders(); }}
        onSelectFile={handleManagerSelect}
        selectedFileId={selectedFileId}
      />
    </div>
  );
}
