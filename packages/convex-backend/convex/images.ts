import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const editTypeValidator = v.union(
  v.literal("original"),
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
);

const verifyChainOwnership = (chain: any, userId: string): any => {
  if (!chain || chain.userId !== userId) {
    throw new Error("Chain not found or access denied");
  }
  return chain;
};

export const generateUploadUrl = mutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Get all images for a specific chain, ordered by step number
export const list = query({
  args: { chainId: v.id("imageChains"), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      return [];
    }

    // Shared access: anyone who knows the chainId can view the chain.
    // Owner-only operations remain protected in mutations.
    const chain = await ctx.db.get(args.chainId);
    if (!chain) return [];

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
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      return null;
    }
    const chains = await ctx.db
      .query("imageChains")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", args.clerkUserId),
      )
      .order("desc")
      .take(1);
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
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      return [];
    }
    const chains = await ctx.db
      .query("imageChains")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", args.clerkUserId),
      )
      .order("desc")
      .collect();

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
  args: { chainId: v.id("imageChains"), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      return null;
    }

    // Shared access: anyone who knows the chainId can fetch the chain.
    const chain = await ctx.db.get(args.chainId);
    if (!chain) return null;

    return {
      ...chain,
      originalUrl: await ctx.storage.getUrl(chain.originalStorageId),
    };
  },
});

// Admin-only: list other users' chains for discovery/debugging.
export const listAllChainsAdmin = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      return [];
    }

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!me?.isAdmin) {
      return [];
    }

    const limit = Math.min(Math.max(args.limit ?? 48, 1), 200);

    const chains = await ctx.db
      .query("imageChains")
      .withIndex("by_created", (q) => q)
      .order("desc")
      .filter((q) => q.neq(q.field("userId"), args.clerkUserId))
      .take(limit);

    return await Promise.all(
      chains.map(async (c) => {
        const owner = await ctx.db
          .query("users")
          .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", c.userId))
          .unique();

        return {
          ...c,
          originalUrl: await ctx.storage.getUrl(c.originalStorageId),
          owner: owner
            ? {
                clerkUserId: owner.clerkUserId,
                name: owner.name,
                email: owner.email,
                imageUrl: owner.imageUrl,
                isAdmin: owner.isAdmin ?? false,
              }
            : null,
        };
      }),
    );
  },
});

// Create a new image chain with an original image
export const createChain = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    originalStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    if (!args.clerkUserId) {
      throw new Error("Not authenticated");
    }
    const now = Date.now();
    
    // Create the chain
    const chainId = await ctx.db.insert("imageChains", {
      userId: args.clerkUserId,
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
    clerkUserId: v.string(),
    storageId: v.id("_storage"),
    prompt: v.string(),
    editType: editTypeValidator,
    parentImageId: v.id("images"),
    stepNumber: v.number(),
    zoomPercent: v.number(),
    brightnessPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    verifyChainOwnership(chain, args.clerkUserId);
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
  args: { chainId: v.id("imageChains"), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    verifyChainOwnership(chain, args.clerkUserId);
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

// Delete any leaf image (an image with no children).
// Step 0 (original) cannot be deleted via this mutation.
export const deleteLeafImage = mutation({
  args: { imageId: v.id("images"), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    const chain = await ctx.db.get(image.chainId);
    verifyChainOwnership(chain, args.clerkUserId);

    if (image.stepNumber === 0) {
      throw new Error("Cannot delete original image");
    }

    // Check if this image has any children (other images that reference it as parent)
    const children = await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", image.chainId))
      .filter((q) => q.eq(q.field("parentImageId"), args.imageId))
      .collect();

    if (children.length > 0) {
      throw new Error("Cannot delete image with children");
    }

    await ctx.db.delete(image._id);
    try {
      await ctx.storage.delete(image.storageId);
    } catch {
      // Ignore storage deletion errors (e.g. already deleted)
    }

    return { deletedImageId: image._id, deletedStepNumber: image.stepNumber };
  },
});

// Delete a chain and all of its images (including the original), then remove
// the associated storage objects.
export const deleteChain = mutation({
  args: { chainId: v.id("imageChains"), clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    const verified = verifyChainOwnership(chain, args.clerkUserId);

    const images = await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", args.chainId))
      .order("asc")
      .collect();

    const storageIds = new Set<typeof verified.originalStorageId>();
    storageIds.add(verified.originalStorageId);
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
