"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pause, Play, Square, Edit, Loader2, ArrowLeft } from "lucide-react";
import { processCampaignRecord, pauseCampaign, resumeCampaign, stopCampaign, getCampaign, type Campaign, type CampaignRecord } from "@/lib/whatsapp-actions";
import { Link } from "@/i18n/navigation";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  stopped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
};

export default function CampaignDashboard({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const router = useRouter();
  const t = useTranslations("UnconfirmedData");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [records, setRecords] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadCampaign(id: string) {
    try {
      const data = await getCampaign(id);
      setCampaign(data.campaign);
      setRecords(data.records);
    } catch {
      router.push("/unconfirmed-data");
    } finally {
      setLoading(false);
    }
  }

  async function handlePause() {
    if (!campaign) return;
    await pauseCampaign(campaign.id);
    setCampaign((prev) => prev ? { ...prev, status: "paused" } : prev);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setSending(false);
  }

  async function handleResume() {
    if (!campaign) return;
    await resumeCampaign(campaign.id);
    setCampaign((prev) => prev ? { ...prev, status: "active" } : prev);
  }

  async function handleStop() {
    if (!campaign) return;
    await stopCampaign(campaign.id);
    setCampaign((prev) => prev ? { ...prev, status: "stopped" } : prev);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setSending(false);
  }

  function getRandomDelay() {
    if (!campaign) return 2000;
    const min = campaign.delay_ms || 2000;
    const max = campaign.delay_max_ms || min;
    if (max <= min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function sendNext() {
    if (!campaign) return;
    try {
      const result = await processCampaignRecord(campaign.id);
      setCampaign(result.campaign);
      if (result.record) {
        setRecords((prev) => prev.map((r) => r.id === result.record.id ? result.record : r));
      }
      if (result.done) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setSending(false);
        return;
      }
      timeoutRef.current = setTimeout(sendNext, getRandomDelay());
    } catch {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setSending(false);
    }
  }

  useEffect(() => {
    const p = params;
    p.then((resolved) => {
      loadCampaign(resolved.id);
    });
  }, [params]);

  useEffect(() => {
    if (!campaign) return;
    if (campaign.status === "active" && !timeoutRef.current) {
      setSending(true);
      timeoutRef.current = setTimeout(sendNext, getRandomDelay());
    }
    if (campaign.status !== "active" && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setSending(false);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [campaign?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const processedCount = campaign.processed_count;
  const totalCount = campaign.total_count;
  const progressPct = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/unconfirmed-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{t("campaignDashboard")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_BADGE[campaign.status] || ""}>
            {campaign.status === "active" ? t("campaignActive") :
             campaign.status === "paused" ? t("campaignPaused") :
             campaign.status === "completed" ? t("campaignCompleted") :
             campaign.status === "stopped" ? t("campaignStopped") : campaign.status}
          </Badge>
          {campaign.status === "active" && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4" />
              {t("pause")}
            </Button>
          )}
          {campaign.status === "paused" && (
            <>
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="h-4 w-4" />
                {t("resume")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleStop}>
                <Square className="h-4 w-4" />
                {t("stop")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("totalCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("processedCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{processedCount} <span className="text-sm text-muted-foreground">({progressPct}%)</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("successCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{campaign.success_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("failedCount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{campaign.failed_count}</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full rounded-full bg-secondary h-2.5 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {sending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("recordsToSend")}...
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("recordsToSend")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ownerName")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("phoneAlt")}</TableHead>
                <TableHead>{t("whatsappState")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {t("noData")}
                  </TableCell>
                </TableRow>
              )}
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.owner_name}</TableCell>
                  <TableCell dir="ltr">{r.owner_phone || r.phone_normalized}</TableCell>
                  <TableCell dir="ltr">{r.owner_phone_alt}</TableCell>
                  <TableCell>
                    {r.state === "send" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t("sent")}</Badge>
                    ) : r.state === "failed" ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t("sendFailed")}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">{t("notSent")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
