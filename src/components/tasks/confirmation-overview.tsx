"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  Folder as FolderIcon,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  ListTree,
} from "lucide-react";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import type { TaskRow, TaskStatus } from "@/lib/task-types";
import type { Folder } from "@/lib/unconfirmed-folder-actions";
import { cn } from "@/lib/utils";

interface Props {
  folders: Folder[];
  tasks: TaskRow[];
  employeeNames: Record<string, string>;
}

function taskTarget(task: TaskRow): number {
  return task.records_target ?? task.target ?? 0;
}

function taskConfirmed(task: TaskRow): number {
  const target = taskTarget(task);
  if (!target) return 0;
  return Math.round((task.progress / 100) * target);
}

const statusMeta: Record<TaskStatus, { labelKey: string; color: string }> = {
  todo: { labelKey: "columnTodo", color: "bg-gray-400" },
  in_progress: { labelKey: "columnInProgress", color: "bg-amber-500" },
  done: { labelKey: "columnDone", color: "bg-emerald-500" },
};

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          value >= 100 ? "bg-emerald-500" : "bg-primary"
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function ConfirmationTaskCard({
  task,
  employeeName,
}: {
  task: TaskRow;
  employeeName: string;
}) {
  const t = useTranslations("Tasks");
  const target = taskTarget(task);
  const confirmed = taskConfirmed(task);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums">
          {Math.min(task.progress, 100)}%
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className={cn("size-2 rounded-full", statusMeta[task.status].color)} />
          {t(statusMeta[task.status].labelKey)}
        </span>
        {employeeName && <span>{employeeName}</span>}
        {target > 0 && (
          <span className="inline-flex items-center gap-1">
            <ClipboardCheck className="size-3.5" />
            {t("recordsLabel", { confirmed, target })}
          </span>
        )}
      </div>

      <div className="mt-2">
        <ProgressBar value={task.progress} />
      </div>
    </div>
  );
}

function FileRow({
  file,
  fileTasks,
  employeeNames,
}: {
  file: { id: string; name: string };
  fileTasks: TaskRow[];
  employeeNames: Record<string, string>;
}) {
  const t = useTranslations("Tasks");
  const [open, setOpen] = useState(false);

  const target = fileTasks.reduce((s, task) => s + taskTarget(task), 0);
  const confirmed = fileTasks.reduce((s, task) => s + taskConfirmed(task), 0);
  const progress = target ? Math.round((confirmed / target) * 100) : 0;

  return (
    <div className="rounded-xl border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-start"
      >
        <FileText className="size-4 shrink-0 text-chart-4" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {confirmed}/{target}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      <div className="px-3 pb-2.5">
        <ProgressBar value={progress} />
      </div>
      {open && (
        <div className="space-y-2 border-t px-3 py-3">
          {fileTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noConfirmationTasks")}</p>
          ) : (
            fileTasks.map((task) => (
              <ConfirmationTaskCard
                key={task.id}
                task={task}
                employeeName={employeeNames[task.assigned_to] ?? ""}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ConfirmationOverview({ folders, tasks, employeeNames }: Props) {
  const t = useTranslations("Tasks");
  const { data: liveTasks, setInitialData } = useRealtimeSync<TaskRow>("tasks");

  useEffect(() => {
    setInitialData(tasks);
  }, [tasks, setInitialData]);

  const sourceTasks = liveTasks.length > 0 ? liveTasks : tasks;

  const tree = useMemo(() => {
    const fileMap = new Map<string, { name: string; folderId: string | null }>();
    folders.forEach((f) =>
      f.files.forEach((file) => fileMap.set(file.id, { name: file.name, folderId: f.id }))
    );

    const tasksByFile = new Map<string, TaskRow[]>();
    const orphanTasks: TaskRow[] = [];
    for (const task of sourceTasks) {
      if (task.file_id && fileMap.has(task.file_id)) {
        const arr = tasksByFile.get(task.file_id) ?? [];
        arr.push(task);
        tasksByFile.set(task.file_id, arr);
      } else {
        orphanTasks.push(task);
      }
    }

    const folderNodes = folders.map((folder) => {
      const files = folder.files.map((file) => {
        const fileTasks = tasksByFile.get(file.id) ?? [];
        const target = fileTasks.reduce((s, task) => s + taskTarget(task), 0);
        const confirmed = fileTasks.reduce((s, task) => s + taskConfirmed(task), 0);
        const progress = target ? Math.round((confirmed / target) * 100) : 0;
        return { id: file.id, name: file.name, tasks: fileTasks, target, confirmed, progress };
      });
      const target = files.reduce((s, f) => s + f.target, 0);
      const confirmed = files.reduce((s, f) => s + f.confirmed, 0);
      const progress = target ? Math.round((confirmed / target) * 100) : 0;
      return { id: folder.id, name: folder.name, files, target, confirmed, progress };
    });

    const totalTarget = sourceTasks.reduce((s, task) => s + taskTarget(task), 0);
    const totalConfirmed = sourceTasks.reduce((s, task) => s + taskConfirmed(task), 0);
    const overallProgress = totalTarget ? Math.round((totalConfirmed / totalTarget) * 100) : 0;

    return { folderNodes, orphanTasks, totalTarget, totalConfirmed, overallProgress };
  }, [sourceTasks, folders]);

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListTree className="size-4 text-primary" />
              {t("overallProgress")}
            </div>
            <span className="text-2xl font-bold tabular-nums">{tree.overallProgress}%</span>
          </div>
          <ProgressBar value={tree.overallProgress} className="h-3" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ClipboardCheck className="size-3.5" />
              {t("recordsLabel", { confirmed: tree.totalConfirmed, target: tree.totalTarget })}
            </span>
            <span>{t("allFolders")}: {tree.folderNodes.length}</span>
            <span>{t("filesCount", { count: folders.reduce((s, f) => s + f.files.length, 0) })}</span>
            <span>{t("tasksCount", { count: sourceTasks.length })}</span>
          </div>
        </CardContent>
      </Card>

      {sourceTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <CheckCircle2 className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noConfirmationTasks")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tree.folderNodes.map((folder) => {
            const isOpen = openFolders[folder.id] ?? false;
            return (
              <Card key={folder.id}>
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setOpenFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start"
                  >
                    <FolderIcon className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("filesCount", { count: folder.files.length })} ·{" "}
                        {t("tasksCount", { count: folder.files.reduce((s, f) => s + f.tasks.length, 0) })}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{folder.progress}%</span>
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                  </button>
                  <div className="px-4 pb-3">
                    <ProgressBar value={folder.progress} />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t("recordsLabel", { confirmed: folder.confirmed, target: folder.target })}
                    </p>
                  </div>

                  {isOpen && (
                    <div className="space-y-2 border-t px-4 py-3">
                      {folder.files.map((file) => (
                        <FileRow key={file.id} file={file} fileTasks={file.tasks} employeeNames={employeeNames} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {tree.orphanTasks.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Circle className="size-4 text-muted-foreground" />
                  {t("uncategorized")}
                </div>
                {tree.orphanTasks.map((task) => (
                  <ConfirmationTaskCard
                    key={task.id}
                    task={task}
                    employeeName={employeeNames[task.assigned_to] ?? ""}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
