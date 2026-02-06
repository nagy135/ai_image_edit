import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import type { Id } from "@repo/convex-backend/convex/_generated/dataModel";

function App() {
  const [currentChainId, setCurrentChainId] = useState<Id<"imageChains"> | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  
  const chain = useQuery(
    api.images.getChain,
    currentChainId ? { chainId: currentChainId } : "skip"
  );
  const images = useQuery(
    api.images.list,
    currentChainId ? { chainId: currentChainId } : "skip"
  );
  const allChains = useQuery(api.images.listChains);
  const createChain = useMutation(api.images.createChain);
  const addEditedImage = useMutation(api.images.addEditedImage);
  const generateWithImages = useAction(api.generateImage.generateWithImages);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When images change, select the latest one
  useEffect(() => {
    if (images && images.length > 0) {
      setSelectedImageIndex(images.length - 1);
    }
  }, [images?.length]);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result as string;

        // Upload via our Vite middleware
        const response = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData }),
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { path } = await response.json();

        // Create a new chain in Convex
        const chainId = await createChain({
          name: file.name,
          imagePath: path,
        });

        setCurrentChainId(chainId);
        setShowUpload(false);
        setSelectedImageIndex(0);
      };
      reader.readAsDataURL(file);
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
  const getImageUrl = (imagePath: string, createdAt?: number) => {
    const timestamp = createdAt || Date.now();
    return `${imagePath}${imagePath.includes('?') ? '&' : '?'}t=${timestamp}`;
  };

  // Helper to fetch image as base64
  const fetchImageAsBase64 = async (imagePath: string): Promise<string> => {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleNewImage = () => {
    setCurrentChainId(null);
    setShowUpload(true);
    setSelectedImageIndex(0);
  };

  const handleCenterClick = async () => {
    if (!currentChainId || !images || images.length === 0) return;

    setIsGenerating(true);
    try {
      const prompt = "Center the main object in the image";
      
      // Get current and original images
      const sortedImages = [...images].sort((a, b) => b.stepNumber - a.stepNumber);
      const latestImage = sortedImages[0];
      const originalImage = images.find(img => img.stepNumber === 0);
      
      if (!originalImage) {
        throw new Error("Original image not found");
      }

      // Fetch images as base64
      const currentImageBase64 = await fetchImageAsBase64(latestImage.imagePath);
      let originalImageBase64: string | undefined;
      
      // Include original for steps 2+
      if (latestImage.stepNumber > 0) {
        originalImageBase64 = await fetchImageAsBase64(originalImage.imagePath);
      }

      // Call the action to generate new image
      const result = await generateWithImages({
        chainId: currentChainId,
        prompt,
        currentImageBase64,
        originalImageBase64,
        stepNumber: latestImage.stepNumber + 1,
      });

      // Save the generated image via Vite middleware
      const saveResponse = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: result.imageBase64 }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save generated image");
      }

      const { path } = await saveResponse.json();

      // Small delay to ensure file is written and Vite picks it up
      await new Promise(resolve => setTimeout(resolve, 100));

      // Store in Convex database
      await addEditedImage({
        chainId: currentChainId,
        imagePath: path,
        prompt,
        stepNumber: result.stepNumber,
      });

    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectChain = (chainId: Id<"imageChains">) => {
    setCurrentChainId(chainId);
    setShowUpload(false);
    setSelectedImageIndex(0);
  };

  // No image mode / Upload mode
  if (showUpload || !currentChainId || !images || images.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload area */}
          <div
            className="w-full border-4 border-dashed border-gray-600 rounded-lg p-16 text-center hover:border-gray-500 transition-colors cursor-pointer mb-8"
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
            <div className="text-6xl mb-4">+</div>
            <h2 className="text-2xl font-bold mb-2">
              {isUploading ? "Uploading..." : "Upload a New Image"}
            </h2>
            <p className="text-gray-400">
              Drag and drop an image here, or click to select
            </p>
          </div>

          {/* Existing chains */}
          {allChains && allChains.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-300">
                Or continue with an existing project
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allChains.map((chain) => (
                  <div
                    key={chain._id}
                    onClick={() => handleSelectChain(chain._id)}
                    className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  >
                    <div className="aspect-square bg-gray-700">
                      <img
                        src={chain.originalImagePath}
                        alt={chain.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{chain.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(chain.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  const currentImage = images[selectedImageIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Image Edit</h1>
          <button
            onClick={handleNewImage}
            className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
          >
            New Image
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Current Image Display */}
        <div className="max-w-4xl w-full mb-8">
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <img
              src={getImageUrl(currentImage.imagePath, currentImage.createdAt)}
              alt={`Step ${currentImage.stepNumber}`}
              className="w-full h-auto max-h-[60vh] object-contain rounded"
            />
          </div>

          {/* Edit Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleCenterClick}
              disabled={isGenerating}
              className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed font-semibold"
            >
              {isGenerating ? "Generating..." : "Center"}
            </button>
          </div>

          {/* Image info */}
          <div className="mt-4 text-center text-gray-400 text-sm">
            <p>Step {currentImage.stepNumber}</p>
            {currentImage.prompt && (
              <p className="italic">"{currentImage.prompt}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-gray-800 p-4 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-sm font-semibold mb-3 text-gray-400">Timeline</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <div
                key={image._id}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 cursor-pointer transition-all ${
                  selectedImageIndex === index
                    ? "ring-2 ring-blue-500"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <div className="w-32 h-32 bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={getImageUrl(image.imagePath, image.createdAt)}
                    alt={`Step ${image.stepNumber}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs text-center mt-1 text-gray-400">
                  Step {image.stepNumber}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
