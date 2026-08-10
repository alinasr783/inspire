"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ShareQrCodeProps {
  text: string;
}

export function ShareQrCode({ text }: ShareQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(text, {
      width: 240,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [text]);

  if (!dataUrl) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-60 w-60 animate-pulse bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <img
        src={dataUrl}
        alt="Share QR Code"
        className="h-60 w-60"
      />
    </div>
  );
}
