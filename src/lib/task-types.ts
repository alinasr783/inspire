export type TaskRow = {
  id: string;
  title: string;
  progress: number;
  status: "active" | "overdue" | "completed";
  due_date: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type EmployeeRow = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string | null;
  position: string | null;
};

export type EmployeeWithTasks = {
  id: string;
  name: string;
  position: string;
  tasks: TaskRow[];
};

export type OverviewStats = {
  activeTasks: number;
  overdue: number;
  completedToday: number;
  employeesAvailable: number;
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
    tasks: taskMap.get(emp.id) ?? [],
  }));
}

export function calculateOverviewStats(employees: EmployeeWithTasks[]): OverviewStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let activeTasks = 0;
  let overdue = 0;
  let completedToday = 0;
  let employeesAvailable = 0;

  for (const emp of employees) {
    let hasActiveTasks = false;

    for (const task of emp.tasks) {
      if (task.status === "active") {
        activeTasks++;
        hasActiveTasks = true;
      } else if (task.status === "overdue") {
        overdue++;
        hasActiveTasks = true;
      } else if (task.status === "completed") {
        const completedDate = new Date(task.due_date);
        completedDate.setHours(0, 0, 0, 0);
        if (completedDate.getTime() === today.getTime()) {
          completedToday++;
        }
      }
    }

    if (!hasActiveTasks) {
      employeesAvailable++;
    }
  }

  return { activeTasks, overdue, completedToday, employeesAvailable };
}
