import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const editTypeValidator = v.union(
  v.literal("original"),
  v.literal("align_left"),
  v.literal("align_right"),
  v.literal("center"),
  v.literal("make_old"),
  v.literal("manual"),
  v.literal("zoom"),
  v.literal("brightness"),
  v.literal("unknown"),
);

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
      editType: "original",
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
    editType: editTypeValidator,
    parentImageId: v.id("images"),
    stepNumber: v.number(),
    zoomPercent: v.number(),
    brightnessPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      chainId: args.chainId,
      parentImageId: args.parentImageId,
      storageId: args.storageId,
      prompt: args.prompt,
      editType: args.editType,
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
    editType: editTypeValidator,
    parentImageId: v.id("images"),
    stepNumber: v.number(),
    zoomPercent: v.number(),
    brightnessPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      chainId: args.chainId,
      parentImageId: args.parentImageId,
      storageId: args.storageId,
      prompt: args.prompt,
      editType: args.editType,
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

// Delete the most recent (highest stepNumber) image in a chain.
// Step 0 (original) cannot be deleted via this mutation.
export const deleteLastStep = mutation({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", args.chainId))
      .order("asc")
      .collect();

    if (images.length <= 1) {
      throw new Error("No edited steps to delete");
    }

    const last = images[images.length - 1];
    if (!last || last.stepNumber === 0) {
      throw new Error("Cannot delete original image");
    }

    await ctx.db.delete(last._id);
    try {
      await ctx.storage.delete(last.storageId);
    } catch {
      // Ignore storage deletion errors (e.g. already deleted)
    }

    return { deletedImageId: last._id, deletedStepNumber: last.stepNumber };
  },
});

// Delete a chain and all of its images (including the original), then remove
// the associated storage objects.
export const deleteChain = mutation({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    if (!chain) return { deleted: false };

    const images = await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", args.chainId))
      .order("asc")
      .collect();

    const storageIds = new Set<typeof chain.originalStorageId>();
    storageIds.add(chain.originalStorageId);
    for (const img of images) storageIds.add(img.storageId);

    for (const img of images) {
      await ctx.db.delete(img._id);
    }

    await ctx.db.delete(args.chainId);

    for (const storageId of storageIds) {
      try {
        await ctx.storage.delete(storageId);
      } catch {
        // Ignore storage deletion errors (e.g. already deleted)
      }
    }

    return { deleted: true };
  },
});
