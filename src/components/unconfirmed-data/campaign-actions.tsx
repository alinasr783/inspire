"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { CampaignSetupModal } from "@/components/unconfirmed-data/campaign-setup-modal";
import { createCampaign } from "@/lib/whatsapp-actions";

interface Props {
  folderId: string;
  fileId: string;
}

export function CampaignActions({ folderId, fileId }: Props) {
  const t = useTranslations("UnconfirmedData");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: { count: number; delayMinSec: number; delayMaxSec: number; message: string }) {
    setLoading(true);
    await createCampaign({
      count: data.count,
      delayMinMs: data.delayMinSec * 1000,
      delayMaxMs: data.delayMaxSec * 1000,
      message: data.message,
      folderId: folderId || undefined,
      fileId: fileId || undefined,
    });
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        <MessageSquare className="h-4 w-4" />
        {t("confirmData")}
      </Button>
      <CampaignSetupModal
        open={showModal}
        onClose={() => { setShowModal(false); setLoading(false); }}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </>
  );
}
