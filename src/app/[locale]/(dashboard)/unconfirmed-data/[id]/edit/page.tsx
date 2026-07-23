"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getRecord, updateRecordField, type UnconfirmedRecord } from "@/lib/unconfirmed-data-actions";

const FIELDS = [
  { key: "owner_name", label: "ownerName", type: "text" },
  { key: "unit_area", label: "unitArea", type: "text" },
  { key: "building_number", label: "buildingNumber", type: "text" },
  { key: "unit_number", label: "unitNumber", type: "text" },
  { key: "owner_phone", label: "phone", type: "text" },
  { key: "owner_phone_alt", label: "phoneAlt", type: "text" },
  { key: "affiliated_company", label: "affiliatedCompany", type: "text" },
  { key: "last_feedback", label: "lastFeedback", type: "textarea" },
  { key: "last_contact_date", label: "lastContactDate", type: "date" },
];

export default function EditRecordPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const router = useRouter();
  const t = useTranslations("UnconfirmedData");
  const [record, setRecord] = useState<UnconfirmedRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => {
      getRecord(id).then((data) => {
        setRecord(data);
        const initial: Record<string, string> = {};
        for (const f of FIELDS) {
          initial[f.key] = String((data as any)[f.key] ?? "");
        }
        setForm(initial);
        setLoading(false);
      }).catch(() => router.push("/unconfirmed-data"));
    });
  }, [params, router]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      for (const f of FIELDS) {
        const val = form[f.key] ?? "";
        const current = String((record as any)[f.key] ?? "");
        if (val !== current) {
          await updateRecordField(record.id, f.key, val);
        }
      }
      router.push(`/unconfirmed-data/${record.id}`);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/unconfirmed-data/${record.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("edit")}</h1>
          <p className="text-sm text-muted-foreground">{record.owner_name || record.id}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("save")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("recordInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-sm">{t(f.label)}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    rows={3}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    type={f.type}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {record.extra_data && Object.keys(record.extra_data).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium mb-3">{t("extraColumns")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(record.extra_data).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{key}</Label>
                    <Input
                      type="text"
                      value={String(value ?? "")}
                      className="text-sm bg-muted/30"
                      disabled
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
