export function getRelativeDate(date: Date, locale: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isAr = locale === "ar";

  if (diffDays === 0) {
    return isAr ? "مستحق اليوم" : "Due today";
  }
  if (diffDays === 1) {
    return isAr ? "مستحق غداً" : "Due tomorrow";
  }
  if (diffDays === -1) {
    return isAr ? "فات أمس" : "1 day overdue";
  }
  if (diffDays > 1) {
    return isAr
      ? `متبقي ${diffDays} أيام`
      : `Due in ${diffDays} days`;
  }
  return isAr
    ? `فات ${Math.abs(diffDays)} أيام`
    : `${Math.abs(diffDays)} days overdue`;
}
