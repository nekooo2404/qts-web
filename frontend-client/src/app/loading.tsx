import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="page-shell flex min-h-[70vh] flex-col gap-16 py-28" role="status" aria-label="Đang tải nội dung">
      <span className="sr-only">Đang tải nội dung QTS</span>
      <section className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]" aria-hidden="true">
        <div className="space-y-5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-16 w-full max-w-xl" />
          <Skeleton className="h-16 w-4/5 max-w-lg" />
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-12 w-48" />
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      </section>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-xl" />
        ))}
      </section>
    </main>
  );
}
