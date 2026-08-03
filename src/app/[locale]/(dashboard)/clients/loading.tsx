import { TableSkeleton } from "@/components/ui/loading-skeletons";

export default function ClientsLoading() {
  return <TableSkeleton rows={12} cols={8} />;
}
