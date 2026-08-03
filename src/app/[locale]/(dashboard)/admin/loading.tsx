import { TableSkeleton } from "@/components/ui/loading-skeletons";

export default function AdminLoading() {
  return <TableSkeleton rows={8} cols={6} />;
}
