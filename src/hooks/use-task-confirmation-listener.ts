"use client";

import { useRef, useCallback, useEffect } from "react";
import { syncTaskConfirmationProgress } from "@/lib/task-actions";
import type { TaskRow } from "@/lib/task-types";

const ACTIVE_TASKS = new Map<string, number>();
let SYNC_TIMER: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (SYNC_TIMER) return;
  SYNC_TIMER = setInterval(() => {
    const ids = Array.from(ACTIVE_TASKS.keys());
    if (ids.length === 0) {
      stopPolling();
      return;
    }
    ids.forEach((taskId) => {
      syncTaskConfirmationProgress(taskId).catch(() => {});
    });
  }, 3000);
}

function stopPolling() {
  if (SYNC_TIMER) {
    clearInterval(SYNC_TIMER);
    SYNC_TIMER = null;
  }
}

export function useTaskConfirmationListener(task: TaskRow | null) {
  const taskId = task?.id;
  const taskType = task?.task_type;
  const taskStatus = task?.status;
  const registered = useRef(false);

  const register = useCallback(() => {
    if (!taskId || registered.current) return;
    ACTIVE_TASKS.set(taskId, (ACTIVE_TASKS.get(taskId) ?? 0) + 1);
    registered.current = true;
    startPolling();
  }, [taskId]);

  const unregister = useCallback(() => {
    if (!taskId || !registered.current) return;
    const count = (ACTIVE_TASKS.get(taskId) ?? 1) - 1;
    if (count <= 0) {
      ACTIVE_TASKS.delete(taskId);
    } else {
      ACTIVE_TASKS.set(taskId, count);
    }
    registered.current = false;
    if (ACTIVE_TASKS.size === 0) stopPolling();
  }, [taskId]);

  useEffect(() => {
    if (!taskId || taskType !== "confirmation" || taskStatus === "done") {
      unregister();
      return;
    }
    register();

    // Do an immediate sync
    syncTaskConfirmationProgress(taskId).catch(() => {});

    return () => {
      unregister();
    };
  }, [taskId, taskType, taskStatus, register, unregister]);
}
