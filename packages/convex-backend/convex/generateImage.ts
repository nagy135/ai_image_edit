"use node";

// This file is imported by the web app for API typing in a monorepo.
// The web TS config does not include Node globals, so we declare a minimal
// `process.env` shape to satisfy type-checking.
declare const process: { env: Record<string, string | undefined> };
// The Convex Node runtime provides Buffer, but the web TS config doesn't.
// We only need this for base64 encoding/decoding inside the action.
declare const Buffer: any;

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { OpenRouter } from "@openrouter/sdk";
import type { Doc } from "./_generated/dataModel";

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const mimeType = blob.type || "application/octet-stream";
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  return `data:${mimeType};base64,${base64}`;
};

const parseBase64DataUrl = (
  dataUrl: string
): { mimeType: string; arrayBuffer: ArrayBuffer } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid base64 data URL");
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const bytes = Buffer.from(base64Data, "base64");
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return { mimeType, arrayBuffer };
};

// Action that generates, stores, and appends the next step.
export const generateNextStep = action({
  args: {
    chainId: v.id("imageChains"),
    prompt: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    stepNumber: number;
    storageId: Doc<"images">["storageId"];
    url: string | null;
  }> => {
    // Load chain + images
    const chain = (await ctx.runQuery(internal.images.internalGetChain, {
      chainId: args.chainId,
    })) as Doc<"imageChains"> | null;

    if (!chain) {
      throw new Error("Chain not found");
    }

    const images = (await ctx.runQuery(internal.images.internalList, {
      chainId: args.chainId,
    })) as Doc<"images">[];

    if (images.length === 0) {
      throw new Error("No images in chain");
    }

    const sortedImages = images.sort((a, b) => b.stepNumber - a.stepNumber);
    const latestImage = sortedImages[0];
    const originalImage = images.find((img) => img.stepNumber === 0);

    if (!originalImage) {
      throw new Error("Original image not found");
    }

    const nextStepNumber = latestImage.stepNumber + 1;

    const currentBlob = await ctx.storage.get(latestImage.storageId);
    if (!currentBlob) {
      throw new Error("Current image not found in storage");
    }

    const currentImageBase64 = await blobToDataUrl(currentBlob);

    let originalImageBase64: string | undefined;
    // Include original for steps 2+
    if (latestImage.stepNumber > 0) {
      const originalBlob = await ctx.storage.get(originalImage.storageId);
      if (!originalBlob) {
        throw new Error("Original image not found in storage");
      }
      originalImageBase64 = await blobToDataUrl(originalBlob);
    }

    // Initialize OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable not set");
    }
    
    const openRouter = new OpenRouter({
      apiKey,
    });
    
    // Build the message content
    const messageContent: any[] = [
      {
        type: "text",
        text: args.prompt,
      },
      {
        type: "image_url",
        imageUrl: {
          url: currentImageBase64,
        },
      },
    ];
    
    // Add original image for steps 2+
    if (originalImageBase64) {
      messageContent.push({
        type: "text",
        text: "Here is the original image for reference (to avoid deviation):",
      });
      messageContent.push({
        type: "image_url",
        imageUrl: {
          url: originalImageBase64,
        },
      });
    }
    
    // Call OpenRouter
    const result = await openRouter.chat.send({
      chatGenerationParams: {
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        modalities: ["image", "text"],
        stream: false,
      },
    });
    
    // Extract the generated image
    if (!result.choices || result.choices.length === 0) {
      throw new Error("No response from OpenRouter");
    }
    
    const message = result.choices[0].message;
    if (!message.images || message.images.length === 0) {
      throw new Error("No image in response");
    }
    
    const generatedImage = message.images[0];
    const imageDataUrl = generatedImage.imageUrl.url; // Base64 data URL

    // Store image in Convex file storage
    const { mimeType, arrayBuffer } = parseBase64DataUrl(imageDataUrl);
    const storedId = await ctx.storage.store(
      new Blob([arrayBuffer], { type: mimeType })
    );

    // Append step in DB
    await ctx.runMutation(internal.images.addImage, {
      chainId: args.chainId,
      storageId: storedId,
      prompt: args.prompt,
      stepNumber: nextStepNumber,
    });

    return {
      stepNumber: nextStepNumber,
      storageId: storedId,
      url: await ctx.storage.getUrl(storedId),
    };
  },
});
