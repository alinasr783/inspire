"use client";

import { useState, useRef, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { uploadGalleryImages } from "@/lib/gallery-actions";
import type { GalleryImageRow } from "@/lib/gallery-actions";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Upload } from "lucide-react";

const ACCEPTED = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

interface UploadButtonProps {
  unitId: string;
  sectionId: string;
  onUploaded: (images: GalleryImageRow[]) => void;
}

export function UploadButton({ unitId, sectionId, onUploaded }: UploadButtonProps) {
  const t = useTranslations("Properties");
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((f) =>
      ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext)) || f.type.startsWith("image/")
    );
    if (accepted.length === 0) return;
    const newPreviews = accepted.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    previews.forEach((p) => formData.append("files", p.file));

    const result = await uploadGalleryImages(unitId, sectionId, formData);

    if (result.success && result.images) {
      onUploaded(result.images);
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      setPreviews([]);
      toast.success(t("imagesUploaded") ?? "Images uploaded successfully");
    } else {
      toast.error(result.error ?? "Upload failed");
    }

    setUploading(false);
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleInputChange = () => {
    if (inputRef.current?.files?.length) {
      addFiles(inputRef.current.files);
      inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative size-16 overflow-hidden rounded-lg border sm:size-20">
              <img
                src={preview.url}
                alt={preview.file.name}
                className="size-full object-cover"
              />
              <button
                onClick={() => removePreview(index)}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white active:scale-90 hover:bg-red-500"
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition-colors sm:p-4 ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => { if (previews.length === 0) inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="flex flex-col items-center gap-1">
          <ImageIcon className="size-5 text-muted-foreground sm:size-6" />
          <p className="max-w-full break-words text-xs text-muted-foreground">
            {previews.length > 0
              ? `${previews.length} ${t("filesSelected") ?? "files selected"}`
              : (t("dropImagesHere") ?? "Click or drag to upload")}
          </p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => { previews.forEach((p) => URL.revokeObjectURL(p.url)); setPreviews([]); }}
            disabled={uploading}
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            className="w-full sm:w-auto gap-1.5"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              (t("uploading") ?? "Uploading...")
            ) : (
              <>
                <Upload className="size-3.5" />
                {t("uploadImages") ?? "Upload"} ({previews.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
