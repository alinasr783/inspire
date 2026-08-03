import { TableSkeleton } from "@/components/ui/loading-skeletons";

export default function UnconfirmedDataLoading() {
  return <TableSkeleton rows={10} cols={7} />;
}
