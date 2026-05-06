import { signIn } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: { from?: string } }) {
  const from = searchParams?.from && searchParams.from.startsWith("/") ? searchParams.from : "/";
  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-3">Sign in</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        ai-feed is gated behind GitHub auth (no allowlist — any GitHub user can read).
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: from });
        }}
      >
        <button
          type="submit"
          className="w-full px-4 py-2.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-sm font-medium"
        >
          Sign in with GitHub
        </button>
      </form>
    </div>
  );
}
