import Link from "next/link";

export default function NotFound() {
  return (
    <section className="vh-section">
      <div className="vh-container py-20 text-center">
        <p className="vh-kicker text-[var(--vh-pink)]">Page Not Found</p>
        <h1 className="mt-4 text-5xl font-bold uppercase md:text-7xl">Lost the Vibe?</h1>
        <p className="mx-auto mt-4 max-w-[640px] text-base leading-7 text-white/80">
          The page you are looking for is not available. Head back to the main experience and keep exploring.
        </p>
        <Link className="vh-primary-button mt-8" href="/">
          Return Home
        </Link>
      </div>
    </section>
  );
}
