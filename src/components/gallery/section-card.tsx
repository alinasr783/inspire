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
import { Trash2, FolderOpen } from "lucide-react";

interface SectionCardProps {
  section: GallerySectionWithImages;
  unitId: string;
  canManage: boolean;
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FolderOpen className="size-4 text-muted-foreground" />
              {section.name}
            </h3>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteSectionOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          {allImages.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {allImages.map((img, index) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={img.public_url ?? ""}
                    alt={img.original_name ?? ""}
                    fill
                    unoptimized
                    className="cursor-pointer object-cover transition-transform group-hover:scale-105"
                    onClick={() => setLightboxIndex(index)}
                  />
                  {canManage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteImageId(img.id); }}
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                      type="button"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
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
