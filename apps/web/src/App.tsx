import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import type { Doc, Id } from "@repo/convex-backend/convex/_generated/dataModel";
import { EditSlider } from "./components/EditSlider";

type ImageDoc = Doc<"images">;
type ChainDoc = Doc<"imageChains">;
type ImageWithUrl = ImageDoc & { url: string | null };
type ChainWithUrl = ChainDoc & { originalUrl: string | null };

function App() {
  const [currentChainId, setCurrentChainId] = useState<Id<"imageChains"> | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  
  const chain = useQuery(
    api.images.getChain,
    currentChainId ? { chainId: currentChainId } : "skip"
  ) as ChainWithUrl | null | undefined;
  const images = useQuery(
    api.images.list,
    currentChainId ? { chainId: currentChainId } : "skip"
  ) as ImageWithUrl[] | undefined;
  const allChains = useQuery(api.images.listChains) as ChainWithUrl[] | undefined;
  const createChain = useMutation(api.images.createChain);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const generateNextStep = useAction(api.generateImage.generateNextStep);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slider states
  const [zoomLevel, setZoomLevel] = useState(100);
  const [brightnessLevel, setBrightnessLevel] = useState(100);

  // Controls disabled when generating
  const controlsDisabled = isGenerating;
  const uploadDisabled = isUploading;

  // When images change, select the latest one
  useEffect(() => {
    if (images && images.length > 0) {
      setSelectedImageIndex(images.length - 1);
    }
  }, [images?.length]);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };

      const chainId = await createChain({
        name: file.name,
        originalStorageId: storageId,
      });

      setCurrentChainId(chainId);
      setShowUpload(false);
      setSelectedImageIndex(0);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Helper to add cache-busting to image URLs
  const getImageUrl = (url: string, createdAt?: number) => {
    const timestamp = createdAt || Date.now();
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}t=${timestamp}`;
  };

  const handleNewImage = () => {
    setCurrentChainId(null);
    setShowUpload(true);
    setSelectedImageIndex(0);
  };

  // Generic function for generating images with a prompt
  const generateImage = async (prompt: string) => {
    if (!currentChainId || !images || images.length === 0) return;

    setIsGenerating(true);
    try {
      await generateNextStep({
        chainId: currentChainId,
        prompt,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
      // Reset sliders after generation
      setZoomLevel(100);
      setBrightnessLevel(100);
    }
  };

  const handleCenterClick = async () => {
    await generateImage("Center the main object in the image");
  };

  const handleZoomRelease = async (value: number) => {
    if (value === 100) return; // No change
    const direction = value > 100 ? "in" : "out";
    const amount = Math.abs(value - 100);
    const prompt = `Zoom ${direction} on the image by ${amount}%. Keep the same subject and style.`;
    await generateImage(prompt);
  };

  const handleBrightnessRelease = async (value: number) => {
    if (value === 100) return; // No change
    const direction = value > 100 ? "brighter" : "darker";
    const amount = Math.abs(value - 100);
    const prompt = `Make the image ${amount}% ${direction}. Adjust the overall brightness/exposure while keeping the same subject and composition.`;
    await generateImage(prompt);
  };

  const handleSelectChain = (chainId: Id<"imageChains">) => {
    setCurrentChainId(chainId);
    setShowUpload(false);
    setSelectedImageIndex(0);
  };

  // No image mode / Upload mode
  if (showUpload || !currentChainId || !images || images.length === 0) {
    return (
      <div className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl app-anim-in">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-lime-300 shadow-[0_18px_40px_rgba(45,212,191,0.18)]" />
              <div>
                <p className="text-xs tracking-wide text-[color:var(--app-muted)]">AI Image Edit</p>
                <h1 className="text-lg font-semibold">Edit images with quick AI tools</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                {uploadDisabled ? "Uploading..." : "Convex storage"}
              </span>
            </div>
          </header>

          <main className="mt-8 grid gap-6 lg:grid-cols-2">
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
                className={`relative mt-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center transition-colors ${
                  uploadDisabled ? "opacity-60 pointer-events-none" : "hover:bg-white/10 cursor-pointer"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
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
                      <span className="text-sm text-[color:var(--app-muted)]">Preparing chain...</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

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
                      onClick={() => handleSelectChain(c._id)}
                      className="group text-left rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition disabled:opacity-60 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="aspect-square bg-black/20">
                        <img
                          src={getImageUrl(c.originalUrl ?? "", c.createdAt)}
                          alt={c.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
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

  // Edit mode
  const currentImage = images[selectedImageIndex];
  const latestStepNumber = images.reduce((max, img) => Math.max(max, img.stepNumber), 0);

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl app-anim-in">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-lime-300 shadow-[0_18px_40px_rgba(45,212,191,0.18)]" />
            <div>
              <p className="text-xs tracking-wide text-[color:var(--app-muted)]">AI Image Edit</p>
              <h1 className="text-lg font-semibold">
                {chain?.name ?? "Untitled"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGenerating && (
              <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                Generating new step...
              </span>
            )}
            <button
              type="button"
              onClick={handleNewImage}
              disabled={controlsDisabled}
              className="rounded-full px-4 py-2 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              New project
            </button>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
          <div className="space-y-6">
            <section className="app-card rounded-3xl p-5">
              <div className="relative rounded-2xl border border-white/10 bg-black/20 p-3 overflow-hidden">
                <img
                  src={getImageUrl(currentImage.url ?? "", currentImage.createdAt)}
                  alt={`Step ${currentImage.stepNumber}`}
                  className="w-full h-auto max-h-[52vh] lg:max-h-[56vh] object-contain rounded-xl"
                />

                {isGenerating && (
                  <div className="absolute inset-0 grid place-items-center bg-black/45">
                    <div className="app-card-2 rounded-2xl px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <div>
                          <p className="text-sm font-semibold">Working…</p>
                          <p className="text-xs text-[color:var(--app-muted)]">Controls locked until the new image arrives.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                    Viewing step {currentImage.stepNumber}
                  </span>
                  <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                    Latest step {latestStepNumber}
                  </span>
                </div>
                <div className="text-xs text-[color:var(--app-faint)] break-words max-w-full lg:max-w-[64ch]">
                  {currentImage.prompt ? `“${currentImage.prompt}”` : "No prompt for this step"}
                </div>
              </div>
            </section>

            <section className="app-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">History</h3>
                <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                  {images.length} steps
                </span>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => {
                  const isSelected = selectedImageIndex === index;
                  return (
                    <button
                      key={image._id}
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() => {
                        if (controlsDisabled) return;
                        setSelectedImageIndex(index);
                      }}
                      className={`group flex-shrink-0 text-left transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        isSelected ? "" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div
                        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border ${
                          isSelected
                            ? "border-teal-300/70 shadow-[0_0_0_3px_rgba(45,212,191,0.18)]"
                            : "border-white/10"
                        }`}
                      >
                        <img
                          src={getImageUrl(image.url ?? "", image.createdAt)}
                          alt={`Step ${image.stepNumber}`}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="absolute left-2 top-2 app-badge rounded-full px-2 py-0.5 text-[10px] text-[color:var(--app-muted)]">
                          {image.stepNumber}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-[color:var(--app-muted)]">
                        Step {image.stepNumber}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="app-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Adjustments</h2>
                <span className="app-badge rounded-full px-3 py-1 text-xs text-[color:var(--app-muted)]">
                  Release to apply
                </span>
              </div>

              <div className="mt-5 space-y-6">
                <EditSlider
                  label="Zoom"
                  value={zoomLevel}
                  onChange={setZoomLevel}
                  onRelease={handleZoomRelease}
                  disabled={controlsDisabled}
                />
                <EditSlider
                  label="Brightness"
                  value={brightnessLevel}
                  onChange={setBrightnessLevel}
                  onRelease={handleBrightnessRelease}
                  disabled={controlsDisabled}
                />
              </div>
            </section>

            <section className="app-card rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Quick tools</h2>
              <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                One-click edits that generate a new step.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCenterClick}
                  disabled={controlsDisabled}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-teal-400/90 to-lime-300/90 text-black hover:from-teal-300 hover:to-lime-200 shadow-[0_18px_40px_rgba(45,212,191,0.16)]"
                >
                  {isGenerating ? "Generating..." : "Center"}
                </button>
              </div>
            </section>

            <section className="app-card rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Tip</h2>
              <p className="mt-2 text-sm text-[color:var(--app-muted)]">
                Small changes (like 110% zoom or 90% brightness) tend to look more natural than big jumps.
              </p>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
