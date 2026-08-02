"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  Clock,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Trash2,
  Minus,
  Plus,
} from "lucide-react";
import { updateTaskStatus, updateTaskProgress } from "@/lib/task-actions";
import type { TaskRow, TaskStatus } from "@/lib/task-types";
import { toast } from "sonner";

const COLUMNS: { status: TaskStatus; labelKey: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { status: "todo", labelKey: "columnTodo", icon: Circle, color: "#6b7280" },
  { status: "in_progress", labelKey: "columnInProgress", icon: Play, color: "#f59e0b" },
  { status: "done", labelKey: "columnDone", icon: CheckCircle2, color: "#10b981" },
];

function TaskCard({
  task,
  isAdmin,
  onOpenDetail,
  onDelete,
}: {
  task: TaskRow;
  isAdmin: boolean;
  onOpenDetail: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date);
  due.setHours(0, 0, 0, 0);
  const isOverdue = task.status !== "done" && due.getTime() < now.getTime();

  const dateDisplay = new Date(task.due_date).toLocaleDateString(
    "ar-EG",
    { month: "short", day: "numeric" }
  );

  const handleIncrement = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.target || task.target <= 0) return;
    const completed = Math.round((task.progress / 100) * task.target);
    if (completed >= task.target) return;
    const newCompleted = completed + 1;
    const newProgress = Math.round((newCompleted / task.target) * 100);
    updateTaskProgress(task.id, newProgress).catch(() => {});
  }, [task.id, task.progress, task.target]);

  const handleDecrement = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.target || task.target <= 0) return;
    const completed = Math.round((task.progress / 100) * task.target);
    if (completed <= 0) return;
    const newCompleted = completed - 1;
    const newProgress = Math.round((newCompleted / task.target) * 100);
    updateTaskProgress(task.id, newProgress).catch(() => {});
  }, [task.id, task.progress, task.target]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border bg-card p-3 shadow-sm ring-1 ring-foreground/5 transition-shadow hover:shadow",
        isDragging && "shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onOpenDetail(task.id)}
            className="w-full text-left"
          >
            <p className="text-sm font-medium leading-snug">{task.title}</p>
          </button>

          {task.target != null && task.target > 0 ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDecrement}
                  className="flex size-5 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Minus className="size-3" />
                </button>
                <span className="text-xs font-semibold tabular-nums">
                  {Math.round((task.progress / 100) * task.target)}
                  <span className="font-normal text-muted-foreground">/{task.target}</span>
                </span>
                <button
                  onClick={handleIncrement}
                  className="flex size-5 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
                <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">
                  {task.progress}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    task.progress >= 100 ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(task.progress, 100)}%` }}
                />
              </div>
            </div>
          ) : task.progress > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                {task.progress}%
              </span>
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between">
            <span
              className={cn(
                "text-[10px] font-medium flex items-center gap-1",
                isOverdue ? "text-red-600" : "text-muted-foreground"
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="size-3" />
              ) : (
                <Clock className="size-3" />
              )}
              {dateDisplay}
            </span>
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="invisible text-muted-foreground hover:text-destructive group-hover:visible"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  count,
  isAdmin,
  onOpenDetail,
  onDelete,
}: {
  column: (typeof COLUMNS)[number];
  tasks: TaskRow[];
  count: number;
  isAdmin: boolean;
  onOpenDetail: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("Tasks");
  const Icon = column.icon;
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.status,
  });

  return (
    <div
      ref={setDroppableRef}
      className={cn(
        "flex min-h-[300px] flex-col rounded-2xl bg-muted/40 p-3 transition-colors",
        isOver && "bg-muted/60 ring-2 ring-primary/20"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: column.color }}>
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-semibold">{t(column.labelKey)}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onOpenDetail={onOpenDetail}
              onDelete={onDelete}
            />
          ))}
          {tasks.length === 0 && !isOver && (
            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-xs text-muted-foreground">
                {t("columnEmpty")}
              </p>
            </div>
          )}
          {tasks.length === 0 && isOver && (
            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-xs text-primary/70">{t("dropHere")}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskKanban({
  tasks,
  isAdmin,
  onOpenDetail,
}: {
  tasks: TaskRow[];
  isAdmin: boolean;
  onOpenDetail: (id: string) => void;
}) {
  const t = useTranslations("Tasks");
  const [localTasks, setLocalTasks] = useState<TaskRow[]>(tasks);
  const pendingRef = useRef<Set<string>>(new Set());

  // Sync from server only for tasks we didn't recently mutate
  useEffect(() => {
    setLocalTasks((prev) => {
      const pending = pendingRef.current;
      const serverMap = new Map(tasks.map((t) => [t.id, t]));
      const updated = prev.map((pt) => {
        if (pending.has(pt.id)) return pt;
        const server = serverMap.get(pt.id);
        return server ?? pt;
      });
      // Add new tasks from server
      for (const st of tasks) {
        if (!updated.find((u) => u.id === st.id)) {
          updated.push(st);
        }
      }
      return updated;
    });
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useMemo(
    () => ({
      todo: localTasks.filter((t) => t.status === "todo"),
      in_progress: localTasks.filter((t) => t.status === "in_progress"),
      done: localTasks.filter((t) => t.status === "done"),
    }),
    [localTasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const taskId = active.id as string;
      const task = localTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Find target status: over.id is either a task ID or a column droppable ID
      let targetStatus: TaskStatus | null = null;
      for (const col of COLUMNS) {
        if (col.status === (over.id as string)) {
          targetStatus = col.status;
          break;
        }
      }
      if (!targetStatus) {
        for (const col of COLUMNS) {
          if (grouped[col.status].find((t) => t.id === over.id)) {
            targetStatus = col.status;
            break;
          }
        }
      }
      if (!targetStatus || targetStatus === task.status) return;

      // Optimistic update
      pendingRef.current.add(taskId);
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus! } : t))
      );

      // Background sync
      updateTaskStatus(taskId, targetStatus).then((result) => {
        pendingRef.current.delete(taskId);
        if (!result.success) {
          // Revert
          setLocalTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: task.status } : t
            )
          );
          toast.error(t("updateFailed"));
        }
      });
    },
    [localTasks, grouped, t]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      if (!confirm(t("deleteConfirm"))) return;
      const { deleteTask } = await import("@/lib/task-actions");
      // Optimistic removal
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
      const result = await deleteTask(taskId);
      if (!result.success) {
        toast.error(t("deleteFailed"));
      }
    },
    [t]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={grouped[col.status]}
            count={grouped[col.status].length}
            isAdmin={isAdmin}
            onOpenDetail={onOpenDetail}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
