import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="vh-section min-h-screen pt-28 md:pt-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-10">
        <div className="space-y-6">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/4 animate-pulse rounded-full bg-[linear-gradient(90deg,#c62828,#facc15)]" />
          </div>
          <Skeleton className="h-8 w-36 rounded-full bg-white/10" />
          <Skeleton className="h-14 w-full max-w-3xl rounded-[18px] bg-white/10" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Skeleton className="h-56 rounded-[28px] bg-white/8" />
              <div className="flex gap-3">
                <Skeleton className="h-12 w-52 rounded-full bg-white/10" />
                <Skeleton className="h-12 w-56 rounded-full bg-white/10" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-[420px] rounded-[28px] bg-white/8" />
                <Skeleton className="h-[420px] rounded-[28px] bg-white/8" />
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-52 rounded-[28px] bg-white/8" />
              <Skeleton className="h-52 rounded-[28px] bg-white/8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
