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
import {
  getImageModelCreditCost,
  getOpenRouterImageModel,
} from "./modelConfig";

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

const SYSTEM_PROMPT = `
You are an AI image editor.

Your task: edit the image-to-edit according to the Prompt, while keeping the result very close to the input photo unless the Prompt explicitly requests bigger changes.

Hard requirements:
- Preserve the same subject identity (especially faces), scene, and overall style.
- If there are people, they must remain the same people.
- Do not introduce extra people, extra limbs, or major composition changes unless asked.
- Dont change size or aspect ratio of the image, unless prompted otherwise.

Controls:
- Zoom (0-200): 100 = original framing; 0 = zoomed out so main object is ~half size; 200 = zoomed in so main object is ~2x size.
- Brightness (0-200): 100 = original brightness; 0 = black; 200 = white.

Sometimes you will also receive a reference image (e.g. clothing or hairstyle).
When a reference image is present:
- Use it only for what the Prompt requests (e.g. outfit details, hairstyle).
- Keep the subject identity and everything else the same unless explicitly asked.
- If the Prompt asks to dress the subject, use the reference as the outfit guide (garment type, colors, pattern, logos, materials) and make it look realistically fitted.
- If the Prompt asks to change hair, use the reference as the hairstyle guide and change only the hair.

You will receive data in this order (some sections may be omitted depending on availability):

---

Selected image (apply edits to this):

---

Original image (identity reference):

---

Reference image (style guide):

---

Prompt:

---

`;

// Action that generates, stores, and appends the next step.
export const generateNextStep = action({
  args: {
    chainId: v.id("imageChains"),
    clerkUserId: v.string(),
    sourceImageId: v.id("images"),
    prompt: v.string(),
    editType: v.union(
      v.literal("align_left"),
      v.literal("align_right"),
      v.literal("center"),
      v.literal("make_old"),
      v.literal("make_young"),
      v.literal("delete_background"),
      v.literal("add_background"),
      v.literal("remove_object"),
      v.literal("make_square"),
      v.literal("make_circular"),
      v.literal("duplicate_object"),
      v.literal("prettify"),
      v.literal("dress_me"),
      v.literal("change_hair"),
      v.literal("manual"),
      v.literal("zoom"),
      v.literal("brightness"),
      v.literal("unknown"),
    ),
    zoomPercent: v.optional(v.number()),
    brightnessPercent: v.optional(v.number()),
    model: v.optional(v.string()),
    referenceStorageId: v.optional(v.id("_storage")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    stepNumber: number;
    storageId: Doc<"images">["storageId"];
    url: string | null;
  }> => {
    if (!args.clerkUserId) {
      throw new Error("Not authenticated");
    }

    // Load chain + images
    const chain = (await ctx.runQuery(internal.images.internalGetChain, {
      chainId: args.chainId,
    })) as Doc<"imageChains"> | null;

    // Shared access: anyone with the chainId can generate new steps.
    // Credits are always deducted from the caller (args.clerkUserId).
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

    const latestImage = images.reduce((prev, cur) =>
      cur.stepNumber >= prev.stepNumber ? cur : prev,
    );
    const latestStepNumber = latestImage.stepNumber;
    const nextStepNumber = latestStepNumber + 1;

    // Validate that the provided sourceImageId belongs to the chain,
    // and use it as the parent image for branching.
    const requestedSource = (await ctx.runQuery(
      internal.images.internalGetImage,
      {
        imageId: args.sourceImageId,
      },
    )) as Doc<"images"> | null;

    if (!requestedSource) {
      throw new Error("Source image not found");
    }

    if (requestedSource.chainId !== args.chainId) {
      throw new Error("Source image does not belong to chain");
    }

    // Decrement credits once we know the request is valid.
    await ctx.runMutation(internal.users.decrementCredits, {
      clerkUserId: args.clerkUserId,
      amount: getImageModelCreditCost(args.model),
    });

    const parentImage = requestedSource;
    const includeParentImage = parentImage.stepNumber >= 1;
    const primaryImage = parentImage;

    const currentBlob = await ctx.storage.get(primaryImage.storageId);
    if (!currentBlob) {
      throw new Error("Current image not found in storage");
    }

    const currentImageBase64 = await blobToDataUrl(currentBlob);

    let originalImageBase64: string | undefined;
    if (includeParentImage) {
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

    // Optional reference image
    let referenceImageBase64: string | undefined;
    if (args.referenceStorageId) {
      const refBlob = await ctx.storage.get(args.referenceStorageId);
      if (!refBlob) {
        throw new Error("Reference image not found in storage");
      }
      referenceImageBase64 = await blobToDataUrl(refBlob);
    }

    // Build the message content
    // Ordering requirement (for consistency and for reference usage):
    // - Always include the selected image first (the one to edit)
    // - Include original image next when it's a different image (identity reference)
    // - Include reference image last (if provided)
    // - Then the prompt
    const messageContent: any[] = [];

    messageContent.push({
      type: "text",
      text: "Selected image (apply edits to this):",
    });
    messageContent.push({
      type: "image_url",
      imageUrl: {
        url: currentImageBase64,
      },
    });

    if (includeParentImage) {
      if (!originalImageBase64) {
        throw new Error("Original image base64 not available");
      }
      messageContent.push({
        type: "text",
        text: "Original image (identity reference):",
      });
      messageContent.push({
        type: "image_url",
        imageUrl: {
          url: originalImageBase64,
        },
      });
    }

    if (referenceImageBase64) {
      messageContent.push({
        type: "text",
        text: "Reference image (style guide):",
      });
      messageContent.push({
        type: "image_url",
        imageUrl: {
          url: referenceImageBase64,
        },
      });
    }

    const prompt = `${SYSTEM_PROMPT}${args.prompt}`;

    messageContent.push({
      type: "text",
      text: prompt,
    });

    const result = await openRouter.chat.send({
      chatGenerationParams: {
        model: getOpenRouterImageModel(args.model),
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
      parentImageId: args.sourceImageId,
      storageId: storedId,
      prompt: args.prompt,
      editType: args.editType,
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
