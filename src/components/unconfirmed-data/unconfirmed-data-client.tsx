"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, X } from "lucide-react";
import { UploadsTable } from "@/components/unconfirmed-data/uploads-table";
import { CampaignActions } from "@/components/unconfirmed-data/campaign-actions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type UnconfirmedRecord } from "@/lib/unconfirmed-data-actions";
import { getFolders, type Folder } from "@/lib/unconfirmed-folder-actions";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Link } from "@/i18n/navigation";

interface Props {
  initialRecords: UnconfirmedRecord[];
  locale: string;
  userId: string;
  employees: { id: string; name: string }[];
}

export function UnconfirmedDataClient({ initialRecords, locale, userId, employees }: Props) {
  const t = useTranslations("UnconfirmedData");
  const tNav = useTranslations("Nav");
  const searchParams = useSearchParams();

  const { data: liveRecords, setInitialData } = useRealtimeSync<UnconfirmedRecord>("unconfirmed_records");

  useEffect(() => {
    setInitialData(initialRecords);
  }, [initialRecords, setInitialData]);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [folderId, setFolderId] = useState(searchParams.get("folder") ?? "");
  const [fileId, setFileId] = useState(searchParams.get("file") ?? "");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showCount, setShowCount] = useState(50);
  const [feedbackOnly, setFeedbackOnly] = useState(false);

  useEffect(() => {
    getFolders().then((data) => setFolders(data)).catch(() => {});
  }, []);

  useEffect(() => { setShowCount(50); }, [search, folderId, fileId, feedbackOnly]);

  const currentFiles = folders.find((f) => f.id === folderId)?.files ?? [];

  const dataSource = liveRecords.length > 0 ? liveRecords : initialRecords;

  const filteredRecords = useMemo(() => {
    let result = dataSource;
    if (folderId) {
      const matchedFolder = folders.find((f) => f.id === folderId);
      if (matchedFolder) {
        const fileIdsInFolder = matchedFolder.files.map((f) => f.id);
        result = result.filter((r) => r.file_id && fileIdsInFolder.includes(r.file_id));
      }
    }
    if (fileId) {
      result = result.filter((r) => r.file_id === fileId);
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((r) => {
        return [
          r.owner_name, r.unit_area, r.building_number, r.unit_number,
          r.owner_phone, r.owner_phone_alt, r.affiliated_company,
          r.last_feedback, r.last_contact_date,
        ].some((v) => (v ?? "").toLowerCase().includes(term));
      });
    }
    if (feedbackOnly) {
      result = result.filter((r) => !!(r.last_feedback && r.last_feedback.trim()));
    }
    return result;
  }, [dataSource, folderId, fileId, search, folders, feedbackOnly]);

  const columns = [
    { key: "owner_name", label: t("ownerName"), type: "text" },
    { key: "unit_area", label: t("unitArea"), type: "text" },
    { key: "building_number", label: t("buildingNumber"), type: "text" },
    { key: "unit_number", label: t("unitNumber"), type: "text" },
    { key: "owner_phone", label: t("phone"), type: "phone" },
    { key: "owner_phone_alt", label: t("phoneAlt"), type: "phone" },
    { key: "affiliated_company", label: t("affiliatedCompany"), type: "text" },
    { key: "last_feedback", label: t("lastFeedback"), type: "text" },
    { key: "last_contact_date", label: t("lastContactDate"), type: "date" },
    { key: "whatsapp_state", label: t("whatsappState"), type: "text" },
    { key: "assigned_employee", label: t("assignedEmployee"), type: "select" },
  ];

  const selectClass = "appearance-none flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{tNav("unconfirmedData")}</h1>
        <div className="flex items-center gap-2">
          <CampaignActions folderId={folderId} fileId={fileId} />
          <Link href="/unconfirmed-data/add">
            <Button>
              <Plus className="h-4 w-4" />
              {t("addData")}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("allUploads")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("filterSearch")}
                className="ps-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={folderId}
                  onChange={(e) => { setFolderId(e.target.value); setFileId(""); }}
                  className={`${selectClass} pr-7`}
                >
                  <option value="">{t("allFolders")}</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>

              <div className="relative">
                <select
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  className={`${selectClass} pr-7`}
                  disabled={!folderId}
                >
                  <option value="">{folderId ? t("allFiles") : t("selectFolderFirst")}</option>
                  {currentFiles.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>

              <label className={`flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors select-none ${feedbackOnly ? "border-primary/50 bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted/50"}`}>
                <input
                  type="checkbox"
                  checked={feedbackOnly}
                  onChange={(e) => setFeedbackOnly(e.target.checked)}
                  className="sr-only"
                />
                <span className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${feedbackOnly ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all ${feedbackOnly ? "end-0.5" : "start-0.5"}`} />
                </span>
                {t("filterFeedbackOnly")}
              </label>

              {(search || folderId || fileId || feedbackOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                    onClick={() => { setSearch(""); setFolderId(""); setFileId(""); setFeedbackOnly(false); }}
                  className="h-8 gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  {t("filterAll")}
                </Button>
              )}
            </div>
          </div>

          <UploadsTable records={filteredRecords.slice(0, showCount)} columns={columns} locale={locale} selectable={true} userId={userId} employees={employees} />
          {showCount < filteredRecords.length && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setShowCount((c) => c + 50)}>
                {t("showMore")} ({filteredRecords.length - showCount} {t("remaining")})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
