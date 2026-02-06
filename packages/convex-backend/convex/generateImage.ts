"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { OpenRouter } from "@openrouter/sdk";

export const generate = action({
  args: {
    chainId: v.id("imageChains"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the chain to find the original image
    const chain = await ctx.runQuery(internal.images.internalGetChain, {
      chainId: args.chainId,
    });
    
    if (!chain) {
      throw new Error("Chain not found");
    }
    
    // Get all images in the chain to find the latest
    const images = await ctx.runQuery(internal.images.internalList, {
      chainId: args.chainId,
    });
    
    if (images.length === 0) {
      throw new Error("No images in chain");
    }
    
    // Sort by step number to get the latest
    const sortedImages = images.sort((a, b) => b.stepNumber - a.stepNumber);
    const latestImage = sortedImages[0];
    const originalImage = images.find(img => img.stepNumber === 0);
    
    if (!originalImage) {
      throw new Error("Original image not found");
    }
    
    // Initialize OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable not set");
    }
    
    const openRouter = new OpenRouter({
      apiKey,
    });
    
    // Return the image paths and step info - frontend will fetch images and call OpenRouter
    return {
      originalImagePath: originalImage.imagePath,
      currentImagePath: latestImage.imagePath,
      nextStepNumber: latestImage.stepNumber + 1,
    };
  },
});

// Action that takes base64 images and generates a new image
export const generateWithImages = action({
  args: {
    chainId: v.id("imageChains"),
    prompt: v.string(),
    currentImageBase64: v.string(),
    originalImageBase64: v.optional(v.string()),
    stepNumber: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("[generateWithImages] Starting image generation");
    console.log("[generateWithImages] Chain ID:", args.chainId);
    console.log("[generateWithImages] Prompt:", args.prompt);
    console.log("[generateWithImages] Step number:", args.stepNumber);
    console.log("[generateWithImages] Current image base64 length:", args.currentImageBase64.length);
    console.log("[generateWithImages] Has original image:", !!args.originalImageBase64);
    
    // Initialize OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[generateWithImages] OPENROUTER_API_KEY not set!");
      throw new Error("OPENROUTER_API_KEY environment variable not set");
    }
    console.log("[generateWithImages] API key found, length:", apiKey.length);
    
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
          url: args.currentImageBase64,
        },
      },
    ];
    
    // Add original image for steps 2+
    if (args.originalImageBase64) {
      console.log("[generateWithImages] Adding original image for reference (step 2+)");
      messageContent.push({
        type: "text",
        text: "Here is the original image for reference (to avoid deviation):",
      });
      messageContent.push({
        type: "image_url",
        imageUrl: {
          url: args.originalImageBase64,
        },
      });
    }
    
    console.log("[generateWithImages] Message content items:", messageContent.length);
    console.log("[generateWithImages] Calling OpenRouter API...");
    
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
    
    console.log("[generateWithImages] OpenRouter response received");
    console.log("[generateWithImages] Choices count:", result.choices?.length ?? 0);
    
    // Extract the generated image
    if (!result.choices || result.choices.length === 0) {
      console.error("[generateWithImages] No choices in response!");
      console.error("[generateWithImages] Full result:", JSON.stringify(result, null, 2));
      throw new Error("No response from OpenRouter");
    }
    
    const message = result.choices[0].message;
    console.log("[generateWithImages] Message role:", message.role);
    console.log("[generateWithImages] Message has content:", !!message.content);
    console.log("[generateWithImages] Message images count:", message.images?.length ?? 0);
    
    if (!message.images || message.images.length === 0) {
      console.error("[generateWithImages] No images in response!");
      console.error("[generateWithImages] Message content:", message.content);
      throw new Error("No image in response");
    }
    
    const generatedImage = message.images[0];
    const imageDataUrl = generatedImage.imageUrl.url; // Base64 data URL
    
    console.log("[generateWithImages] Generated image URL length:", imageDataUrl.length);
    console.log("[generateWithImages] Generated image URL prefix:", imageDataUrl.substring(0, 50));
    console.log("[generateWithImages] Success! Returning generated image");
    
    // Return the base64 image - frontend will save it via Vite middleware
    return {
      imageBase64: imageDataUrl,
      stepNumber: args.stepNumber,
    };
  },
});
