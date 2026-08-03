import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton({ rows = 10, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 border-b px-4 py-3 last:border-0">
            {Array.from({ length: cols + 1 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardShellSkeleton() {
  return (
    <div className="h-screen overflow-hidden">
      <div className="fixed inset-y-0 start-0 z-40 hidden w-[232px] border-e border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-screen w-full flex-col">
          <div className="flex h-14 items-center gap-2.5 px-5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex-1 space-y-0.5 px-3 py-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2">
                <Skeleton className="h-[18px] w-[18px] rounded" />
                <Skeleton className="h-3.5 flex-1 rounded" />
              </div>
            ))}
          </div>
          <div className="border-t border-sidebar-border px-5 py-3">
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="flex h-full min-w-0 flex-col md:ps-[232px]">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-lg">
          <Skeleton className="h-5 w-28" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <TableSkeleton />
        </main>
      </div>
    </div>
  );
}

function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex h-full gap-4 overflow-x-auto p-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 rounded-xl border bg-muted/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="rounded-lg border bg-background p-3">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="mb-1 h-3 w-full" />
                <Skeleton className="mb-2 h-3 w-1/2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-lg border p-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-28 rounded-md" />
    </div>
  );
}

function ListSkeleton({ lines = 8 }: { lines?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <div className="rounded-lg border">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  TableSkeleton,
  DashboardShellSkeleton,
  CardsSkeleton,
  KanbanSkeleton,
  ChartsSkeleton,
  FormSkeleton,
  ListSkeleton,
};
