import { Skeleton } from "@/components/ui/skeleton";

export default function GuestLoading() {
  return (
    <section className="min-h-screen bg-[#07070a] pb-28 pt-6 text-white md:pb-16 md:pt-8">
      <div className="mx-auto w-full max-w-[1180px] space-y-7 px-4 md:px-6 xl:px-0">
        <Skeleton className="h-5 w-24 rounded-[4px] bg-[var(--vh-pink)]/25" />
        <Skeleton className="h-12 w-full max-w-sm rounded-[8px] bg-white/10" />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Skeleton className="h-[430px] rotate-[-2deg] rounded-none bg-white/12" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-52 rounded-[8px] bg-[var(--vh-pink)]/25" />
            <Skeleton className="h-52 rounded-[8px] bg-[#1e293b]" />
            <Skeleton className="h-40 rounded-[8px] bg-[#16070c] sm:col-span-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-[8px] bg-[#16070c]" />
          <Skeleton className="h-40 rounded-[8px] bg-[#16070c]" />
          <Skeleton className="h-40 rounded-[8px] bg-[#16070c]" />
        </div>
      </div>
    </section>
  );
}
