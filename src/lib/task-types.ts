export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskType = "confirmation" | null;

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  target: number | null;
  status: TaskStatus;
  due_date: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  task_type: TaskType;
  folder_id: string | null;
  file_id: string | null;
  records_target: number | null;
};

export type EmployeeRow = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string | null;
  position: string | null;
  avatar_url: string | null;
};

export type EmployeeWithTasks = {
  id: string;
  name: string;
  position: string;
  avatarUrl: string | null;
  tasks: TaskRow[];
};

export type OverviewStats = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
};

export function getEmployeeDisplayName(
  emp: { first_name?: string | null; second_name?: string | null }
): string {
  return [emp.first_name, emp.second_name].filter(Boolean).join(" ");
}

export function combineEmployeesWithTasks(
  employees: EmployeeRow[],
  tasks: TaskRow[]
): EmployeeWithTasks[] {
  const taskMap = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    const list = taskMap.get(task.assigned_to) ?? [];
    list.push(task);
    taskMap.set(task.assigned_to, list);
  }

  return employees.map((emp) => ({
    id: emp.id,
    name: getEmployeeDisplayName(emp),
    position: emp.position ?? "",
    avatarUrl: emp.avatar_url ?? null,
    tasks: taskMap.get(emp.id) ?? [],
  }));
}

export function calculateOverviewStats(employees: EmployeeWithTasks[]): OverviewStats {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let total = 0;
  let todo = 0;
  let inProgress = 0;
  let done = 0;
  let overdue = 0;

  for (const emp of employees) {
    for (const task of emp.tasks) {
      total++;
      if (task.status === "todo") todo++;
      else if (task.status === "in_progress") inProgress++;
      else if (task.status === "done") done++;

      const due = new Date(task.due_date);
      due.setHours(0, 0, 0, 0);
      if (task.status !== "done" && due.getTime() < now.getTime()) {
        overdue++;
      }
    }
  }

  return { total, todo, inProgress, done, overdue };
}
