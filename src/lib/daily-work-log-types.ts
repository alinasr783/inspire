export type ActionResult = { success: true; id?: string } | { success: false; error: string };

export const WORK_CATEGORIES = [
  "تطوير",
  "تصميم",
  "اجتماعات",
  "دعم فني",
  "تسويق",
  "مبيعات",
  "تدريب",
  "إداري",
] as const;

export const WORK_STATUSES = ["مكتملة", "قيد التنفيذ", "متوقفة"] as const;

export type DailyWorkLogRow = {
  id: string;
  employee_id: string;
  log_date: string;
  title: string;
  description: string | null;
  hours: number;
  category: string;
  status: string;
  department: string | null;
  attachment_paths: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type DailyWorkLogWithEmployee = DailyWorkLogRow & {
  employee: {
    id: string;
    first_name: string;
    second_name: string;
    position: string;
    avatar_url: string | null;
  } | null;
};

export type MonthlyStats = {
  totalHours: number;
  totalEntries: number;
  completionRate: number;
};
