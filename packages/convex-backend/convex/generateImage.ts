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
  dataUrl: string,
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
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return { mimeType, arrayBuffer };
};

// Action that generates, stores, and appends the next step.
export const generateNextStep = action({
  args: {
    chainId: v.id("imageChains"),
    sourceImageId: v.id("images"),
    prompt: v.string(),
    zoomPercent: v.optional(v.number()),
    brightnessPercent: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
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

    const originalImage = images.find((img) => img.stepNumber === 0);

    if (!originalImage) {
      throw new Error("Original image not found");
    }

    const lastImage = images.reduce((prev, cur) =>
      cur.stepNumber >= prev.stepNumber ? cur : prev,
    );
    const latestStepNumber = lastImage.stepNumber;
    const nextStepNumber = latestStepNumber + 1;

    // We still validate that the provided sourceImageId belongs to the chain,
    // but we always generate using the last image in the chain.
    const requestedSource = (await ctx.runQuery(internal.images.internalGetImage, {
      imageId: args.sourceImageId,
    })) as Doc<"images"> | null;

    if (!requestedSource) {
      throw new Error("Source image not found");
    }

    if (requestedSource.chainId !== args.chainId) {
      throw new Error("Source image does not belong to chain");
    }

    const includeLastImage = latestStepNumber >= 1;
    const primaryImage = includeLastImage ? lastImage : originalImage;

    const currentBlob = await ctx.storage.get(primaryImage.storageId);
    if (!currentBlob) {
      throw new Error("Current image not found in storage");
    }

    const currentImageBase64 = await blobToDataUrl(currentBlob);

    let originalImageBase64: string | undefined;
    if (includeLastImage) {
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
    // Content ordering requirement:
    // - First generation: original_image, prompt
    // - Subsequent generations: original_image, last_image_in_chain, prompt
    const messageContent: any[] = [];

    messageContent.push({
      type: "text",
      text: "Original image:",
    });
    messageContent.push({
      type: "image_url",
      imageUrl: {
        url: originalImageBase64 ?? currentImageBase64,
      },
    });

    if (includeLastImage) {
      messageContent.push({
        type: "text",
        text: "Latest image in the chain (apply edits to this):",
      });
      messageContent.push({
        type: "image_url",
        imageUrl: {
          url: currentImageBase64,
        },
      });
    }

    messageContent.push({
      type: "text",
      text: args.prompt,
    });

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
      new Blob([arrayBuffer], { type: mimeType }),
    );

    // Append step in DB
    await ctx.runMutation(internal.images.addImage, {
      chainId: args.chainId,
      storageId: storedId,
      prompt: args.prompt,
      stepNumber: nextStepNumber,
      zoomPercent: args.zoomPercent ?? primaryImage.zoomPercent ?? 100,
      brightnessPercent:
        args.brightnessPercent ?? primaryImage.brightnessPercent ?? 100,
    });

    return {
      stepNumber: nextStepNumber,
      storageId: storedId,
      url: await ctx.storage.getUrl(storedId),
    };
  },
});
