"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, X } from "lucide-react";
import { UploadsTable } from "@/components/unconfirmed-data/uploads-table";
import { CampaignActions } from "@/components/unconfirmed-data/campaign-actions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShortcutsHelp } from "@/components/units/shortcuts-help";
import { type UnconfirmedRecord, getRecords, getUnconfirmedRecordsCount } from "@/lib/unconfirmed-data-actions";
import { getFolders, type Folder } from "@/lib/unconfirmed-folder-actions";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Link } from "@/i18n/navigation";

interface Props {
  initialRecords: UnconfirmedRecord[];
  initialTotalCount: number;
  pageSize: number;
  locale: string;
  userId: string;
  employees: { id: string; name: string }[];
}

export function UnconfirmedDataClient({ initialRecords, initialTotalCount, pageSize, locale, userId, employees }: Props) {
  const t = useTranslations("UnconfirmedData");
  const tNav = useTranslations("Nav");
  const searchParams = useSearchParams();

  const { data: liveRecords, setInitialData } = useRealtimeSync<UnconfirmedRecord>("unconfirmed_records");

  const [syncCount, setSyncCount] = useState(0);
  const handlePendingChange = useCallback((c: number) => setSyncCount(c), []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setInitialData(initialRecords);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag: بعد أول مزامنة نعتمد liveRecords حتى لو أصبح فارغاً
    setHydrated(true);
  }, [initialRecords, setInitialData]);

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [folderId, setFolderId] = useState(searchParams.get("folder") ?? "");
  const [fileId, setFileId] = useState(searchParams.get("file") ?? "");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [feedbackOnly, setFeedbackOnly] = useState(false);
  const requestIdRef = useRef(0);
  const liveRecordsRef = useRef(liveRecords);
  useEffect(() => {
    liveRecordsRef.current = liveRecords;
  }, [liveRecords]);
  // حاوية السكرول + عنصر المراقبة للتحميل التلقائي عند الوصول لأسفل القائمة
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce للبحث النصي — البحث يتم على السيرفر عبر كل الصفوف وليس المحمّل منها فقط
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    getFolders().then((data) => setFolders(data)).catch(() => {});
  }, []);

  const currentFiles = folders.find((f) => f.id === folderId)?.files ?? [];

  // إعادة التحميل من السيرفر عند تغيّر الفلاتر (بحث / فولدر / ملف / فيدباك)
  useEffect(() => {
    if (!hydrated) return;
    const requestId = ++requestIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-filter-change: جلب أول 40 صف من السيرفر عند تغيّر الفلاتر
    setIsFiltering(true);
    // العودة لأعلى القائمة مع كل فلتر جديد
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    const filters = {
      q: search.trim() || undefined,
      folderId: folderId || undefined,
      fileId: fileId || undefined,
      hasFeedback: feedbackOnly || undefined,
    };
    Promise.all([
      getRecords({ ...filters, limit: pageSize, offset: 0 }),
      getUnconfirmedRecordsCount(filters),
    ])
      .then(([rows, count]) => {
        if (requestIdRef.current !== requestId) return;
        setInitialData(rows);
        setTotalCount(count);
      })
      .catch(() => {})
      .finally(() => {
        if (requestIdRef.current === requestId) setIsFiltering(false);
      });
  }, [search, folderId, fileId, feedbackOnly, hydrated, pageSize, setInitialData]);

  // تحميل الدفعة التالية من السيرفر وإلحاقها بالقائمة
  const handleLoadMore = useCallback(async () => {
    if (isLoading || isFiltering) return;
    const offset = liveRecordsRef.current.length;
    if (offset >= totalCount) return;
    setIsLoading(true);
    try {
      const rows = await getRecords({
        q: search.trim() || undefined,
        folderId: folderId || undefined,
        fileId: fileId || undefined,
        hasFeedback: feedbackOnly || undefined,
        limit: pageSize,
        offset,
      });
      if (rows.length === 0) {
        setTotalCount(offset);
        return;
      }
      const seen = new Set(liveRecordsRef.current.map((r) => r.id));
      const merged = [...liveRecordsRef.current, ...rows.filter((r) => !seen.has(r.id))];
      setInitialData(merged);
    } catch {
      // يُترك الخطأ صامتاً — يبقى الزر متاحاً لإعادة المحاولة
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isFiltering, totalCount, search, folderId, fileId, feedbackOnly, pageSize, setInitialData]);

  // مرآة لأحدث نسخة من handleLoadMore حتى لا يستدعي الـ observer نسخة قديمة (stale closure)
  const loadMoreLatestRef = useRef(handleLoadMore);
  useEffect(() => {
    loadMoreLatestRef.current = handleLoadMore;
  }, [handleLoadMore]);

  const dataSource = hydrated ? liveRecords : initialRecords;

  // فلترة أمان خفيفة على العميل (لإخفاء أي إدراج realtime لا يطابق الفلاتر الحالية)
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
    if (search.trim()) {
      const term = search.trim().toLowerCase();
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

  const hasMore = dataSource.length < totalCount;
  const remaining = Math.max(totalCount - dataSource.length, 0);

  // تحميل تلقائي عند السكرول لأسفل (infinite scroll بأسلوب فيسبوك):
  // عنصر مراقبة في نهاية القائمة + هامش تحميل مسبق 600px حتى تبدأ الدفعة التالية قبل الوصول للنهاية.
  // الدفعات صغيرة (40 صف) والطلبات محمية بـ isLoading حتى لا تتكدس على الأجهزة الضعيفة.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isFiltering) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreLatestRef.current();
      },
      { root: scrollContainerRef.current, rootMargin: "600px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFiltering, filteredRecords.length]);

  const columns = useMemo(() => [
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
  ], [t]);

  const selectClass = "appearance-none flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{tNav("unconfirmedData")} <ShortcutsHelp locale={locale} /></h1>
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

      <Card className="flex max-h-[calc(100vh-180px)] flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <span>{t("allUploads")}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
              {totalCount}
            </span>
            {filteredRecords.length !== dataSource.length && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                ({t("totalRecords")}: {dataSource.length})
              </span>
            )}
            {syncCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary" title={t("syncingTitle")}>
                <span className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                {t("syncing", { count: syncCount })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400" title={t("syncIdleTitle")}>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("syncIdle")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto pt-0">
          <div className="mb-4 space-y-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); }}
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
                  onChange={(e) => { setFileId(e.target.value); }}
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
                  onChange={(e) => { setFeedbackOnly(e.target.checked); }}
                  className="sr-only"
                />
                <span className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${feedbackOnly ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all ${feedbackOnly ? "end-0.5" : "start-0.5"}`} />
                </span>
                {t("filterFeedbackOnly")}
              </label>

              {(searchInput || folderId || fileId || feedbackOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                    onClick={() => { setSearchInput(""); setSearch(""); setFolderId(""); setFileId(""); setFeedbackOnly(false); }}
                  className="h-8 gap-1 text-xs"
                >
                  <X className="h-3 w-3" />
                  {t("filterAll")}
                </Button>
              )}
            </div>
          </div>

          {isFiltering ? (
            <div className="flex justify-center py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <UploadsTable records={filteredRecords} columns={columns} locale={locale} selectable={true} userId={userId} employees={employees} onPendingChange={handlePendingChange} />
          )}
          <div className="flex flex-col items-center gap-2 pt-4">
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("showingOf", { shown: filteredRecords.length, total: totalCount })}
            </p>
            {/* عنصر المراقبة للتحميل التلقائي عند السكرول — يبقى دائماً في نهاية القائمة */}
            <div ref={sentinelRef} className="flex min-h-10 w-full items-center justify-center">
              {isLoading && (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
            {/* زرار يدوي كبديل (متصفحات بدون IntersectionObserver أو عند فشل التحميل التلقائي) */}
            {hasMore && !isLoading && !isFiltering && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleLoadMore}>
                  {t("showMore")} ({remaining} {t("remaining")})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
