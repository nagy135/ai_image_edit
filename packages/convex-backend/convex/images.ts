import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get all images for a specific chain, ordered by step number
export const list = query({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", args.chainId))
      .order("asc")
      .collect();

    return await Promise.all(
      images.map(async (img) => ({
        ...img,
        url: await ctx.storage.getUrl(img.storageId),
      }))
    );
  },
});

// Get the current active chain (for now, just get the most recent one)
export const getActiveChain = query({
  args: {},
  handler: async (ctx) => {
    const chains = await ctx.db.query("imageChains").order("desc").take(1);
    const chain = chains[0];
    if (!chain) return null;
    return {
      ...chain,
      originalUrl: await ctx.storage.getUrl(chain.originalStorageId),
    };
  },
});

// Get all chains (for chain selector)
export const listChains = query({
  args: {},
  handler: async (ctx) => {
    const chains = await ctx.db.query("imageChains").order("desc").collect();

    return await Promise.all(
      chains.map(async (c) => ({
        ...c,
        originalUrl: await ctx.storage.getUrl(c.originalStorageId),
      }))
    );
  },
});

// Get a specific chain
export const getChain = query({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    if (!chain) return null;
    return {
      ...chain,
      originalUrl: await ctx.storage.getUrl(chain.originalStorageId),
    };
  },
});

// Create a new image chain with an original image
export const createChain = mutation({
  args: {
    name: v.string(),
    originalStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create the chain
    const chainId = await ctx.db.insert("imageChains", {
      name: args.name,
      originalStorageId: args.originalStorageId,
      createdAt: now,
    });
    
    // Add the original image as step 0
    await ctx.db.insert("images", {
      chainId,
      storageId: args.originalStorageId,
      prompt: "", // no prompt for the original
      stepNumber: 0,
      zoomPercent: 100,
      brightnessPercent: 100,
      createdAt: now,
    });
    
    return chainId;
  },
});

// Internal mutation to add a new edited image to the chain
export const addImage = internalMutation({
  args: {
    chainId: v.id("imageChains"),
    storageId: v.id("_storage"),
    prompt: v.string(),
    stepNumber: v.number(),
    zoomPercent: v.number(),
    brightnessPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      chainId: args.chainId,
      storageId: args.storageId,
      prompt: args.prompt,
      stepNumber: args.stepNumber,
      zoomPercent: args.zoomPercent,
      brightnessPercent: args.brightnessPercent,
      createdAt: Date.now(),
    });
    
    return imageId;
  },
});

// Public mutation to add a new edited image to the chain (called by frontend after saving file)
export const addEditedImage = mutation({
  args: {
    chainId: v.id("imageChains"),
    storageId: v.id("_storage"),
    prompt: v.string(),
    stepNumber: v.number(),
    zoomPercent: v.number(),
    brightnessPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      chainId: args.chainId,
      storageId: args.storageId,
      prompt: args.prompt,
      stepNumber: args.stepNumber,
      zoomPercent: args.zoomPercent,
      brightnessPercent: args.brightnessPercent,
      createdAt: Date.now(),
    });
    
    return imageId;
  },
});

// Internal versions for use in actions
export const internalGetChain = internalQuery({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chainId);
  },
});

export const internalList = internalQuery({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", args.chainId))
      .order("asc")
      .collect();
  },
});

export const internalGetImage = internalQuery({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.imageId);
  },
});
