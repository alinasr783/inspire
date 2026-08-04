"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteGallerySection, deleteGalleryImage } from "@/lib/gallery-actions";
import type { GallerySectionWithImages } from "@/lib/gallery-actions";
import { queryKeys } from "@/hooks/queries/query-keys";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UploadButton } from "@/components/gallery/upload-button";
import { ImageLightbox } from "@/components/gallery/image-lightbox";
import { Trash2, FolderOpen, Download } from "lucide-react";

interface SectionCardProps {
  section: GallerySectionWithImages;
  unitId: string;
  canManage: boolean;
}

async function downloadImage(url: string, filename: string, successMsg: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success(successMsg);
  } catch {
    window.open(url, "_blank");
  }
}

export function SectionCard({ section, unitId, canManage }: SectionCardProps) {
  const t = useTranslations("Properties");
  const queryClient = useQueryClient();
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gallery.byUnit(unitId) });
  };

  const handleDeleteSection = async () => {
    const result = await deleteGallerySection(section.id);
    if (result.success) {
      invalidate();
      toast.success(t("sectionDeleted") ?? "Section deleted");
    } else {
      toast.error(result.error ?? "Failed to delete section");
    }
    setDeleteSectionOpen(false);
  };

  const handleDeleteImage = async () => {
    if (!deleteImageId) return;
    const result = await deleteGalleryImage(deleteImageId);
    if (result.success) {
      invalidate();
      toast.success(t("imageDeleted") ?? "Image deleted");
    } else {
      toast.error(result.error ?? "Failed to delete image");
    }
    setDeleteImageId(null);
  };

  const handleImagesUploaded = () => {
    invalidate();
  };

  const allImages = section.images ?? [];

  return (
    <>
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{section.name}</span>
            </h3>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteSectionOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          {allImages.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {allImages.map((img, index) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={img.public_url ?? ""}
                    alt={img.original_name ?? ""}
                    fill
                    unoptimized
                    sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="cursor-pointer object-cover transition-transform active:scale-95 group-hover:scale-105"
                    onClick={() => setLightboxIndex(index)}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(img.public_url ?? "", img.original_name ?? "image", t("imageDownloaded") ?? "Downloaded successfully"); }}
                      className="flex size-6 items-center justify-center rounded-full bg-black/40 text-white opacity-70 transition-opacity hover:bg-primary hover:opacity-100 active:scale-90"
                      type="button"
                    >
                      <Download className="size-3" />
                    </button>
                    {canManage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteImageId(img.id); }}
                        className="flex size-6 items-center justify-center rounded-full bg-black/40 text-white opacity-70 transition-opacity hover:bg-red-500 hover:opacity-100 active:scale-90"
                        type="button"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <UploadButton unitId={unitId} sectionId={section.id} onUploaded={handleImagesUploaded} />
          )}
        </CardContent>
      </Card>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={allImages}
          initialIndex={lightboxIndex}
          open={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <ConfirmDialog
        open={deleteSectionOpen}
        onOpenChange={setDeleteSectionOpen}
        title={t("confirmDeleteSection") ?? "Delete section and all its images?"}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        onConfirm={handleDeleteSection}
      />

      <ConfirmDialog
        open={deleteImageId !== null}
        onOpenChange={(v) => { if (!v) setDeleteImageId(null); }}
        title={t("confirmDeleteImage") ?? "Delete this image?"}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        onConfirm={handleDeleteImage}
      />
    </>
  );
}
