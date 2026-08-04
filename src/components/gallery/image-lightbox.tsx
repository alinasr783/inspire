"use client";

import { useTranslations } from "next-intl";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";
import Captions from "yet-another-react-lightbox/plugins/captions";
import type { GalleryImageRow } from "@/lib/gallery-actions";

interface ImageLightboxProps {
  images: GalleryImageRow[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, open, onClose }: ImageLightboxProps) {
  const t = useTranslations("Properties");

  const slides = images.map((img) => ({
    src: img.public_url ?? "",
    alt: img.original_name ?? "",
    description: `${t("uploadedBy") ?? "Uploaded by"}: ${img.uploader_name || "—"}\n${new Date(img.created_at).toLocaleString()}`,
  }));

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={initialIndex}
      slides={slides}
      plugins={[Zoom, Captions]}
      zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
      captions={{ descriptionTextAlign: "center" }}
    />
  );
}
