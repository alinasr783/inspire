"use client";

import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

function escapeVcf(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

interface AddToContactsButtonProps {
  phone: string;
  fullName: string;
  note?: string;
}

export function AddToContactsButton({
  phone,
  fullName,
  note,
}: AddToContactsButtonProps) {
  const t = useTranslations("Properties");

  const handleClick = () => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${fullName}`,
      `TEL;TYPE=CELL:${phone}`,
    ];
    if (note) lines.push(`NOTE:${escapeVcf(note)}`);
    lines.push("END:VCARD");

    const vcard = lines.join("\r\n");
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contact.vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 justify-center gap-1.5"
      onClick={handleClick}
    >
      <UserPlus className="size-3.5" />
      {t("addToContacts")}
    </Button>
  );
}
