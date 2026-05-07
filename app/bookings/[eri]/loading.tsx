import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="vh-section min-h-screen pt-28 md:pt-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-10">
        <div className="space-y-6">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/5 animate-pulse rounded-full bg-[linear-gradient(90deg,#00d1ff,#c62828)]" />
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Skeleton className="h-[420px] rounded-[28px] bg-white/8" />
              <Skeleton className="h-16 rounded-[18px] bg-white/8" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-56 rounded-[28px] bg-white/8" />
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 rounded-[22px] bg-white/8" />
                <Skeleton className="h-28 rounded-[22px] bg-white/8" />
                <Skeleton className="h-28 rounded-[22px] bg-white/8" />
              </div>
              <Skeleton className="h-[260px] rounded-[28px] bg-white/8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
