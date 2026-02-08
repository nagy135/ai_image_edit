import { APP_SHELL_STYLE } from "../constants";
import type { ChainWithUrl, Id } from "../types";
import { getImageUrl } from "../utils";
import { UserButton } from "@clerk/clerk-react";

interface UploadViewProps {
  allChains?: ChainWithUrl[];
  uploadDisabled: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChain: (chainId: Id<"imageChains">) => void;
}

export function UploadView({
  allChains,
  uploadDisabled,
  fileInputRef,
  onDrop,
  onFileInputChange,
  onSelectChain,
}: UploadViewProps) {
  return (
    <div className="min-h-screen px-6 py-10" style={APP_SHELL_STYLE}>
      <div className="mx-auto max-w-6xl app-anim-in">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-lime-300 shadow-[0_18px_40px_rgba(45,212,191,0.18)]" />
            <div>
              <p className="text-xs tracking-wide text-[color:var(--app-muted)]">
                AI Image Edit
              </p>
              <h1 className="text-lg font-semibold">
                Edit images with quick AI tools
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            />
            <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
              {uploadDisabled ? "Uploading..." : "Convex storage"}
            </span>
          </div>
        </header>

        <main className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Upload section */}
          <section className="app-card rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Start a new edit</h2>
                <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                  Drop an image, then use sliders and one-click tools.
                </p>
              </div>
              <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                Release sliders to apply
              </span>
            </div>

            <div
              className={`relative mt-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center transition-colors cursor-pointer ${
                uploadDisabled
                  ? "opacity-60 pointer-events-none"
                  : "hover:bg-white/10"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileInputChange}
                className="hidden"
              />

              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 grid place-items-center">
                <div className="h-6 w-6 rounded-md border border-white/30" />
              </div>
              <h3 className="mt-5 text-base font-semibold">
                {uploadDisabled ? "Uploading image" : "Drop an image or click"}
              </h3>
              <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                PNG, JPG, WEBP. Stored in Convex file storage.
              </p>

              {uploadDisabled && (
                <div className="absolute inset-0 grid place-items-center rounded-3xl bg-black/30">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-sm text-[color:var(--app-muted)]">
                      Preparing chain...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Recent projects section */}
          <section className="app-card rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Recent projects</h2>
                <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                  Jump back into an image chain.
                </p>
              </div>
              <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                {allChains?.length ?? 0} total
              </span>
            </div>

            {allChains && allChains.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {allChains.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    disabled={uploadDisabled}
                    onClick={() => onSelectChain(c._id)}
                    className="group text-left rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="aspect-square bg-black/20">
                      <img
                        src={getImageUrl(c.originalUrl ?? "", c.createdAt)}
                        alt={c.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold truncate">
                        {c.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[color:var(--app-muted)]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-[color:var(--app-muted)]">
                  No projects yet. Upload an image to start your first chain.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
