import { listDates } from "@/lib/digest";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const dates = await listDates();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">ai-feed</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        signed in as {session?.user?.name ?? "—"}. {dates.length} digest{dates.length === 1 ? "" : "s"} available.
      </p>
      <p className="text-sm">scaffold-only — pages land in stage 2.</p>
    </div>
  );
}
