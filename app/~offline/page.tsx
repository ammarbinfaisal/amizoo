import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Offline
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Amizoo can&apos;t reach the internet right now.
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          You can reopen the app once your connection is back. Previously cached
          data may still be available on pages you already visited.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Try again
          </Link>
        </div>
      </div>
    </main>
  );
}
