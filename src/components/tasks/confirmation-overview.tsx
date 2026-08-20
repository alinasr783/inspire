"use client";

import { useMemo, useState } from "react";
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
import type { TaskRow, TaskStatus } from "@/lib/task-types";
import type { Folder } from "@/lib/unconfirmed-folder-actions";
import { cn } from "@/lib/utils";

interface Props {
  folders: Folder[];
  tasks: TaskRow[];
  liveTasks: TaskRow[];
  fileTotals: Record<string, number>;
  taskConfirmed: Record<string, number>;
  fileDone: Record<string, number>;
  employeeNames: Record<string, string>;
}

function taskTarget(task: TaskRow): number {
  return task.records_target ?? task.target ?? 0;
}

interface FileStats {
  total: number;
  target: number;
  done: number;
}

function completionPct(total: number, target: number, doneRaw: number): number {
  const denom = Math.max(total, target, 1);
  const done = Math.min(doneRaw, total);
  return Math.round((done / denom) * 100);
}

const statusMeta: Record<TaskStatus, { labelKey: string; color: string }> = {
  todo: { labelKey: "columnTodo", color: "bg-gray-400" },
  in_progress: { labelKey: "columnInProgress", color: "bg-amber-500" },
  done: { labelKey: "columnDone", color: "bg-emerald-500" },
};

function StackedComparison({
  total,
  done,
  target,
}: FileStats) {
  const t = useTranslations("Tasks");
  const denom = Math.max(total, target, 1);
  const doneC = Math.min(done, total);
  const doneFrac = doneC / denom;
  const amberFrac = Math.min(Math.max(0, target - doneC) / denom, 1 - doneFrac);
  const grayFrac = Math.max(0, 1 - doneFrac - amberFrac);
  const donePct = doneFrac * 100;
  const remPct = amberFrac * 100;
  const notPct = grayFrac * 100;
  const remaining = Math.max(0, target - doneC);
  const notInTasks = Math.max(0, total - target);

  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${remPct}%` }} />
        <div className="h-full bg-muted-foreground/30 transition-all" style={{ width: `${notPct}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          {t("comparisonDone")}: {doneC}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-amber-500" />
          {t("comparisonRemaining")}: {remaining}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
          {t("comparisonNotInTasks")}: {notInTasks}
        </span>
        <span className="ms-auto inline-flex items-center gap-1">
          <ClipboardCheck className="size-3.5" />
          {t("comparisonTotal", { total })}
        </span>
        {target > 0 && (
          <span className="inline-flex items-center gap-1">
            {t("comparisonTarget", { target })}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfirmationTaskCard({
  task,
  done,
  target,
  employeeName,
}: {
  task: TaskRow;
  done: number;
  target: number;
  employeeName: string;
}) {
  const t = useTranslations("Tasks");
  const progress = target > 0 ? Math.round((done / target) * 100) : task.progress;

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums">{Math.min(progress, 100)}%</span>
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
            {t("recordsLabel", { confirmed: done, target })}
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress >= 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function FileRow({
  file,
  fileTasks,
  taskConfirmed,
  employeeNames,
}: {
  file: { id: string; name: string } & FileStats;
  fileTasks: TaskRow[];
  taskConfirmed: Record<string, number>;
  employeeNames: Record<string, string>;
}) {
  const t = useTranslations("Tasks");
  const [open, setOpen] = useState(false);

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
          {t("comparisonTotalShort", { total: file.total })}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      <div className="px-3 pb-2.5">
        <StackedComparison total={file.total} done={file.done} target={file.target} />
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
                done={taskConfirmed[task.id] ?? 0}
                target={taskTarget(task)}
                employeeName={employeeNames[task.assigned_to] ?? ""}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ConfirmationOverview({
  folders,
  tasks,
  liveTasks,
  fileTotals,
  taskConfirmed,
  fileDone,
  employeeNames,
}: Props) {
  const t = useTranslations("Tasks");

  const sourceTasks = useMemo(() => {
    if (liveTasks.length === 0) return tasks;
    const liveMap = new Map(liveTasks.map((task) => [task.id, task]));
    return tasks.map((task) => liveMap.get(task.id) ?? task);
  }, [tasks, liveTasks]);

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

    const buildStats = (total: number, target: number, doneRaw: number): FileStats => {
      const done = Math.min(doneRaw, total);
      return { total, target, done };
    };

    const computeStats = (fileId: string, fileTasks: TaskRow[]): FileStats => {
      const total = fileTotals[fileId] ?? 0;
      const target = fileTasks.reduce((s, task) => s + taskTarget(task), 0);
      const doneRaw = fileDone[fileId] ?? 0;
      return buildStats(total, target, doneRaw);
    };

    const folderNodes = folders.map((folder) => {
      const files = folder.files.map((file) => ({
        id: file.id,
        name: file.name,
        ...computeStats(file.id, tasksByFile.get(file.id) ?? []),
        tasks: tasksByFile.get(file.id) ?? [],
      }));
      const total = files.reduce((s, f) => s + f.total, 0);
      const target = files.reduce((s, f) => s + f.target, 0);
      const done = files.reduce((s, f) => s + f.done, 0);
      return {
        id: folder.id,
        name: folder.name,
        files,
        ...buildStats(total, target, done),
      };
    });

    const totalAll = folderNodes.reduce((s, f) => s + f.total, 0);
    const targetAll = folderNodes.reduce((s, f) => s + f.target, 0);
    const doneAll = folderNodes.reduce((s, f) => s + f.done, 0);

    return {
      folderNodes,
      orphanTasks,
      totalAll,
      targetAll,
      doneAll,
    };
  }, [sourceTasks, folders, fileTotals, fileDone]);

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
            <span className="text-2xl font-bold tabular-nums">
              {completionPct(tree.totalAll, tree.targetAll, tree.doneAll)}%
            </span>
          </div>
          <StackedComparison
            total={tree.totalAll}
            done={tree.doneAll}
            target={tree.targetAll}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{t("allFolders")}: {tree.folderNodes.length}</span>
            <span>{t("filesCount", { count: folders.reduce((s, f) => s + f.files.length, 0) })}</span>
            <span>{t("tasksCount", { count: sourceTasks.length })}</span>
          </div>
        </CardContent>
      </Card>

      {folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <CheckCircle2 className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noConfirmationTasks")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sourceTasks.length === 0 && (
            <p className="rounded-lg bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
              {t("noConfirmationTasks")}
            </p>
          )}

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
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {completionPct(folder.total, folder.target, folder.done)}%
                    </span>
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                  </button>
                  <div className="px-4 pb-3">
                    <StackedComparison total={folder.total} done={folder.done} target={folder.target} />
                  </div>

                  {isOpen && (
                    <div className="space-y-2 border-t px-4 py-3">
                      {folder.files.map((file) => (
                        <FileRow key={file.id} file={file} fileTasks={file.tasks} taskConfirmed={taskConfirmed} employeeNames={employeeNames} />
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
                    done={taskConfirmed[task.id] ?? 0}
                    target={taskTarget(task)}
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
