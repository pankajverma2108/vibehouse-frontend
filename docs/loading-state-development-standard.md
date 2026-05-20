# Next.js Loading State Development Standard

Date: 2026-04-18
Owner: Frontend Engineering
Applies to: App Router pages, route segments, client-side async components, and mutation flows

## Why this standard exists

Loading behavior must feel intentional, stable, and consistent across booking and non-booking flows. Users should see structure immediately, not plain loading sentences, while data streams or client-side async work completes.

## Non-negotiable rules

1. Do not show visible "Loading..." copy in UI loading surfaces.
2. Use visual skeletons or shimmer placeholders that resemble final layout blocks.
3. Keep status text for assistive tech only (for example with `sr-only` + `role="status"` + `aria-live="polite"`).
4. Prevent layout shift by keeping placeholder heights and widths close to final content.
5. Keep shared layouts interactive during route transitions.

## Decision matrix

### A) Route navigation loading

Use route-segment `loading.tsx` when the route or sub-route can suspend during navigation.

- Add `loading.tsx` in dynamic or slower segments.
- Ensure fallback mirrors page shell and major sections.
- Do not rely on text-only fallback UI.

### B) In-page async sections (client state, `useEffect`, data refresh)

Use conditional rendering with skeleton blocks inside the existing page shell.

- Keep header and surrounding layout mounted.
- Replace text placeholders with section-level skeleton cards/rows.
- Keep an `sr-only` loading announcement if needed.

### C) Server Component async boundaries

Use `<Suspense>` for nested async units and provide a meaningful visual fallback.

- Prefer multiple local boundaries over one page-wide blocking boundary.
- Fall back to skeletons that match each section.

### D) Mutation and form pending states

Use pending signals from React/Next patterns:

- `useActionState` pending for Server Actions.
- `useTransition` pending for transition-driven updates.
- Disable submit/critical controls while pending.
- Use inline spinners/icons in controls only when needed, not full-page text loaders.

### E) Lazy-loaded client code

Use `next/dynamic` or dynamic `import()` for optional heavy client components/libraries.

- Provide a visual loading fallback component.
- Avoid text-only loading placeholders.

## Caching, revalidation, and loading behavior

1. Cache stable data and stream uncached runtime data under Suspense boundaries.
2. After mutation, revalidate precisely:
   - Use tag-based revalidation when possible.
   - Use path revalidation when tags are not available.
3. In read-your-own-write flows, prefer immediate freshness semantics after successful mutation.
4. Avoid over-invalidating pages that causes unnecessary loading flashes.

## Error-state coordination

1. Expected errors (validation, known backend responses): return structured state and render inline message.
2. Uncaught exceptions: handle with route-level `error.tsx` boundaries.
3. Missing resources: use `notFound()` and `not-found.tsx`.
4. Never conflate loading and error copy in the same visual block.

## Typography, images, and layout stability during load

1. Use `next/font` for predictable font loading and reduced layout shift.
2. Use `next/image` with dimensions or fill strategy to avoid image-shift jumps.
3. Match skeleton geometry to final image/text card geometry.

## PR review checklist for loading states

1. No visible "Loading" strings in user-facing loading branches.
2. Every dynamic route has `loading.tsx` where navigation latency is possible.
3. In-page async blocks use skeletons, not text placeholders.
4. Accessibility status is present but visually hidden.
5. Error, empty, and loading states are distinct and testable.
6. Scoped lint checks pass for modified files.

## Suggested search commands

Use these during implementation and review:

```bash
rg -n "Loading " app components
rg -n "isLoading|isPending|isRestoringSession|catalogLoading" app components
npm run lint:loading-copy
```

## Source documentation

- https://nextjs.org/docs/app/getting-started/linking-and-navigating
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/api-reference/file-conventions/loading
- https://nextjs.org/docs/app/getting-started/mutating-data
- https://nextjs.org/docs/app/getting-started/caching
- https://nextjs.org/docs/app/getting-started/revalidating
- https://nextjs.org/docs/app/getting-started/error-handling
- https://nextjs.org/docs/app/getting-started/fonts
- https://nextjs.org/docs/app/getting-started/images
- https://nextjs.org/docs/app/guides/lazy-loading
