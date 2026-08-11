"use client";

import { useTaskConfirmationListener } from "@/hooks/use-task-confirmation-listener";
import type { TaskRow } from "@/lib/task-types";

function ConfirmationTaskItem({ task }: { task: TaskRow }) {
  useTaskConfirmationListener(task);
  return null;
}

export function TaskConfirmationTracker({ tasks }: { tasks: TaskRow[] }) {
  const confirmationTasks = tasks.filter((t) => t.task_type === "confirmation" && t.status !== "done");

  return (
    <>
      {confirmationTasks.map((task) => (
        <ConfirmationTaskItem key={task.id} task={task} />
      ))}
    </>
  );
}
