import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="vh-section min-h-screen pt-28 md:pt-32">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-10">
        <div className="space-y-6">
          <Skeleton className="h-14 w-full max-w-4xl rounded-[18px] bg-white/10" />
          <Skeleton className="h-6 w-full max-w-2xl rounded-full bg-white/8" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-6">
              <Skeleton className="h-[420px] rounded-[28px] bg-white/8" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-64 rounded-[28px] bg-white/8" />
                <Skeleton className="h-64 rounded-[28px] bg-white/8" />
              </div>
              <Skeleton className="h-[500px] rounded-[28px] bg-white/8" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[520px] rounded-[28px] bg-white/8" />
              <Skeleton className="h-[420px] rounded-[28px] bg-white/8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
