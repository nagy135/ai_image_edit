import { useEffect, useState, type ReactNode } from "react";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";

import { api } from "@repo/convex-backend/convex/_generated/api";
import { APP_SHELL_STYLE } from "../../constants";
import { Button } from "../ui/button";

export function AuthLoadingView({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen px-6 py-10" style={APP_SHELL_STYLE}>
      <div className="mx-auto max-w-4xl app-anim-in">
        <div className="app-card rounded-3xl p-6 lg:p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-[color:var(--app-muted)]">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignedOutView() {
  return (
    <div className="min-h-screen px-6 py-10" style={APP_SHELL_STYLE}>
      <div className="mx-auto max-w-6xl app-anim-in">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-lime-300 shadow-[0_18px_40px_rgba(45,212,191,0.18)]" />
            <div>
              <p className="text-xs tracking-wide text-[color:var(--app-muted)]">
                AI Image Edit
              </p>
              <h1 className="text-lg font-semibold">
                Private AI edits, just for you
              </h1>
            </div>
          </div>
          <SignInButton mode="modal">
            <Button
              type="button"
              variant="secondary"
              className="h-auto rounded-full px-4 py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              Sign in
            </Button>
          </SignInButton>
        </header>

        <main className="mt-10 gap-6 ">
          <section className="app-card rounded-3xl p-6 lg:p-8 max-w-xl mx-auto flex flex-col items-center">
            <h2 className="text-xl font-semibold">Ready to start?</h2>
            <p className="mt-2 text-sm text-[color:var(--app-muted)]">
              Sign in to unlock your personal chain library.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <SignInButton mode="modal">
                <Button
                  type="button"
                  className="h-auto rounded-full px-4 py-2 text-xs font-semibold bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 transition"
                >
                  Sign in
                </Button>
              </SignInButton>
              <span className="text-xs text-[color:var(--app-faint)]">
                New here? Sign up takes seconds.
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export function SignedInGate({ children }: { children: ReactNode }) {
  const { user, isLoaded: clerkLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertCurrentUser);
  const [isSynced, setIsSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!clerkLoaded || !user) return;
    let cancelled = false;
    setIsSynced(false);
    setSyncError(null);

    const name = user.fullName ?? user.username ?? undefined;
    const email = user.primaryEmailAddress?.emailAddress ?? undefined;
    const imageUrl = user.imageUrl ?? undefined;

    void upsertUser({ clerkUserId: user.id, name, email, imageUrl })
      .then(() => {
        if (!cancelled) setIsSynced(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error syncing user profile:", error);
        setSyncError("We couldn't sync your profile. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, upsertUser, user]);

  if (syncError) {
    return (
      <div className="min-h-screen px-6 py-10" style={APP_SHELL_STYLE}>
        <div className="mx-auto max-w-3xl app-anim-in">
          <div className="app-card rounded-3xl p-6 lg:p-8 text-center">
            <h1 className="text-lg font-semibold">Sync error</h1>
            <p className="mt-2 text-sm text-[color:var(--app-muted)]">
              {syncError}
            </p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 h-auto rounded-full px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 transition"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!clerkLoaded || !isSynced) {
    return (
      <AuthLoadingView
        title="Setting up your workspace"
        subtitle="Syncing your profile so your chains stay private."
      />
    );
  }

  return <>{children}</>;
}
