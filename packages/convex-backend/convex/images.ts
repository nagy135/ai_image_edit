import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get all images for a specific chain, ordered by step number
export const list = query({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images")
      .withIndex("by_chain", (q) => q.eq("chainId", args.chainId))
      .order("asc")
      .collect();
  },
});

// Get the current active chain (for now, just get the most recent one)
export const getActiveChain = query({
  args: {},
  handler: async (ctx) => {
    const chains = await ctx.db.query("imageChains").order("desc").take(1);
    return chains[0] || null;
  },
});

// Get all chains (for chain selector)
export const listChains = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("imageChains").order("desc").collect();
  },
});

// Get a specific chain
export const getChain = query({
  args: { chainId: v.id("imageChains") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chainId);
  },
});

// Create a new image chain with an original image
export const createChain = mutation({
  args: {
    name: v.string(),
    imagePath: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create the chain
    const chainId = await ctx.db.insert("imageChains", {
      name: args.name,
      originalImagePath: args.imagePath,
      createdAt: now,
    });
    
    // Add the original image as step 0
    await ctx.db.insert("images", {
      chainId,
      imagePath: args.imagePath,
      prompt: "", // no prompt for the original
      stepNumber: 0,
      createdAt: now,
    });
    
    return chainId;
  },
});

// Internal mutation to add a new edited image to the chain
export const addImage = internalMutation({
  args: {
    chainId: v.id("imageChains"),
    imagePath: v.string(),
    prompt: v.string(),
    stepNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      chainId: args.chainId,
      imagePath: args.imagePath,
      prompt: args.prompt,
      stepNumber: args.stepNumber,
      createdAt: Date.now(),
    });
    
    return imageId;
  },
});

// Public mutation to add a new edited image to the chain (called by frontend after saving file)
export const addEditedImage = mutation({
  args: {
    chainId: v.id("imageChains"),
    imagePath: v.string(),
    prompt: v.string(),
    stepNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      chainId: args.chainId,
      imagePath: args.imagePath,
      prompt: args.prompt,
      stepNumber: args.stepNumber,
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
