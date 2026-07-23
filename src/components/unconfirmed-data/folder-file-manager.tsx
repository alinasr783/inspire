"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FolderPlus, FilePlus, Folder as FolderIcon, FileText, Trash2, Pencil, X } from "lucide-react";
import { getFolders, createFolder, createFile, deleteFolder, deleteFile, renameFolder, renameFile, type Folder } from "@/lib/unconfirmed-folder-actions";

interface FolderFileManagerProps {
  open: boolean;
  onClose: () => void;
  onSelectFile?: (fileId: string, fileName: string, folderName: string) => void;
  selectedFileId?: string | null;
}

export function FolderFileManager({ open, onClose, onSelectFile, selectedFileId }: FolderFileManagerProps) {
  const t = useTranslations("UnconfirmedData");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadFolders();
  }, [open]);

  async function loadFolders() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFolders();
      setFolders(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load folders");
    }
    setLoading(false);
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      await loadFolders();
    } catch (err: any) {
      setError(err?.message || "Failed to create folder");
    }
    setCreating(false);
  }

  async function handleCreateFile() {
    if (!newFileName.trim() || !selectedFolderId) return;
    setCreating(true);
    setError(null);
    try {
      await createFile(selectedFolderId, newFileName.trim());
      setNewFileName("");
      await loadFolders();
    } catch (err: any) {
      setError(err?.message || "Failed to create file");
    }
    setCreating(false);
  }

  async function handleDeleteFolder(id: string) {
    setError(null);
    try {
      await deleteFolder(id);
      if (selectedFolderId === id) setSelectedFolderId(null);
      await loadFolders();
    } catch (err: any) {
      setError(err?.message || "Failed to delete folder");
    }
  }

  async function handleDeleteFile(id: string) {
    setError(null);
    try {
      await deleteFile(id);
      await loadFolders();
    } catch (err: any) {
      setError(err?.message || "Failed to delete file");
    }
  }

  async function handleRename() {
    if (!renamingId || !renameValue.trim()) return;
    setError(null);
    const folder = folders.find((f) => f.id === renamingId);
    const file = folders.flatMap((f) => f.files).find((f) => f.id === renamingId);
    try {
      if (folder) await renameFolder(renamingId, renameValue.trim());
      if (file) await renameFile(renamingId, renameValue.trim());
      setRenamingId(null);
      await loadFolders();
    } catch (err: any) {
      setError(err?.message || "Failed to rename");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("foldersAndFiles")}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("noFoldersYet")}</p>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => (
                <div key={folder.id} className="rounded-lg border">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FolderIcon className="h-4 w-4 shrink-0 text-amber-500" />
                      {renamingId === folder.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-7 text-sm flex-1"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRename}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="text-sm font-medium cursor-pointer truncate"
                          onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                        >
                          {folder.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {onSelectFile && folder.files.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {selectedFolderId === folder.id && (
                    <div className="px-3 py-2 space-y-1">
                      {folder.files.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-6">{t("noFilesYet")}</p>
                      ) : (
                        folder.files.map((file) => (
                          <div
                            key={file.id}
                            className={`flex items-center justify-between px-6 py-1.5 rounded hover:bg-muted/30 ${
                              onSelectFile ? "cursor-pointer" : ""
                            } ${selectedFileId === file.id ? "bg-primary/10" : ""}`}
                            onClick={() => {
                              if (onSelectFile) {
                                onSelectFile(file.id, file.name, folder.name);
                                onClose();
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                              {renamingId === file.id ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    className="h-7 text-sm flex-1"
                                    autoFocus
                                  />
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRename}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-sm truncate">{file.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                onClick={(e) => { e.stopPropagation(); setRenamingId(file.id); setRenameValue(file.name); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="flex items-center gap-2 pt-1 px-6">
                        <Input
                          placeholder={t("newFileName")}
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          className="h-7 text-sm flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={!newFileName.trim() || creating}
                          onClick={handleCreateFile}
                        >
                          <FilePlus className="h-3 w-3" />
                          {t("add")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Input
              placeholder={t("newFolderName")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={!newFolderName.trim() || creating}
              onClick={handleCreateFolder}
            >
              <FolderPlus className="h-4 w-4" />
              {t("addFolder")}
            </Button>
          </div>
        </div>

        {!onSelectFile && (
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose}>
              {t("close")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
