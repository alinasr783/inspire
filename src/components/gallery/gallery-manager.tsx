"use client";

import { useTranslations } from "next-intl";
import { useGalleryQuery } from "@/hooks/queries/use-gallery-query";
import type { GallerySectionWithImages } from "@/lib/gallery-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSectionDialog } from "@/components/gallery/create-section-dialog";
import { SectionCard } from "@/components/gallery/section-card";
import { Images } from "lucide-react";

interface GalleryManagerProps {
  unitId: string;
  canManage: boolean;
  initialData?: GallerySectionWithImages[];
}

export function GalleryManager({ unitId, canManage, initialData }: GalleryManagerProps) {
  const t = useTranslations("Properties");
  const { data: sections, refetch } = useGalleryQuery(unitId, initialData);

  const currentSections = sections ?? [];

  const handleSectionCreated = () => {
    refetch();
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Images className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{t("gallery") ?? "Gallery"}</span>
          </CardTitle>
          {canManage && (
            <CreateSectionDialog
              unitId={unitId}
              onCreated={handleSectionCreated}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-3 pt-4 sm:p-4 sm:pt-4 md:p-6 md:pt-4">
        {currentSections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noGallerySections") ?? "No sections yet"}
          </p>
        ) : (
          currentSections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              unitId={unitId}
              canManage={canManage}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
