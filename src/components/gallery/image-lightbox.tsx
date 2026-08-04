"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";
import Captions from "yet-another-react-lightbox/plugins/captions";
import { Download } from "lucide-react";
import type { GalleryImageRow } from "@/lib/gallery-actions";

interface ImageLightboxProps {
  images: GalleryImageRow[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
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

export function ImageLightbox({ images, initialIndex, open, onClose }: ImageLightboxProps) {
  const t = useTranslations("Properties");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const slides = images.map((img) => ({
    src: img.public_url ?? "",
    alt: img.original_name ?? "",
    description: `${t("uploadedBy") ?? "Uploaded by"}: ${img.uploader_name || "\u2014"}\n${new Date(img.created_at).toLocaleString()}`,
  }));

  const currentImage = images[currentIndex];

  const handleDownload = useCallback(() => {
    if (currentImage?.public_url) {
      downloadImage(currentImage.public_url, currentImage.original_name ?? "image", t("imageDownloaded") ?? "Downloaded successfully");
    }
  }, [currentImage, t]);

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={initialIndex}
      slides={slides}
      plugins={[Zoom, Captions]}
      zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
      captions={{ descriptionTextAlign: "center", descriptionMaxLines: 3 }}
      carousel={{ preload: 2 }}
      className="gallery-lightbox"
      on={{ view: ({ index }: { index: number }) => setCurrentIndex(index) }}
      toolbar={{
        buttons: [
          <button
            key="download"
            type="button"
            className="yarl__button"
            title={t("downloadImage") ?? "Download"}
            onClick={handleDownload}
          >
            <Download size={20} />
          </button>,
          "close",
        ],
      }}
    />
  );
}
