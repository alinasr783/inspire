"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";
import { getUnitGallery } from "@/lib/gallery-actions";
import type { GallerySectionWithImages } from "@/lib/gallery-actions";

export function useGalleryQuery(unitId: string, initialData?: GallerySectionWithImages[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.gallery.byUnit(unitId),
    queryFn: () => getUnitGallery(unitId),
    initialData,
    staleTime: 2 * 60 * 1000,
  });

  const invalidateGallery = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gallery.byUnit(unitId) });
  };

  return { ...query, invalidateGallery };
}
