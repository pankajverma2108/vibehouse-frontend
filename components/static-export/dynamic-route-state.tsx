import { Skeleton } from "@/components/ui/skeleton";

export function DynamicRouteState({ invalid = false }: { invalid?: boolean }) {
  if (invalid) {
    return (
      <main className="flex min-h-[70dvh] items-center justify-center bg-[#07070a] px-6 text-center text-white">
        <div className="max-w-md rounded-[18px] border border-white/15 bg-white/[0.04] p-8">
          <h1 className="font-sectiontitle text-3xl">This link is not valid</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">Check the full link and try opening it again.</p>
        </div>
      </main>
    );
  }

  return (
    <main aria-busy="true" className="min-h-[70dvh] bg-[#07070a] px-6 py-28">
      <span className="sr-only">Your stay details are being prepared.</span>
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-12 w-2/3 bg-white/8" />
        <Skeleton className="h-6 w-full bg-white/8" />
        <Skeleton className="h-[360px] w-full rounded-[24px] bg-white/8" />
      </div>
    </main>
  );
}
