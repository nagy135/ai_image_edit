export type ImageModelId =
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image-preview"
  | "~openai/gpt-latest";

export type ImageModelConfig = {
  id: ImageModelId;
  label: string;
  openRouterModel: string;
  creditCost: number;
};

export const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash",
    openRouterModel: "google/gemini-2.5-flash-image",
    creditCost: 1,
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Preview",
    openRouterModel: "google/gemini-3-pro-image-preview",
    creditCost: 2,
  },
  {
    id: "~openai/gpt-latest",
    label: "OpenAI GPT Latest",
    openRouterModel: "~openai/gpt-latest",
    creditCost: 2,
  },
];

export const DEFAULT_IMAGE_MODEL_ID: ImageModelId = "gemini-2.5-flash-image";

export const IMAGE_MODEL_BY_ID = Object.fromEntries(
  IMAGE_MODELS.map((model) => [model.id, model]),
) as Record<ImageModelId, ImageModelConfig>;

export function getImageModelConfig(modelId: string | undefined) {
  return (
    IMAGE_MODELS.find((model) => model.id === modelId) ??
    IMAGE_MODEL_BY_ID[DEFAULT_IMAGE_MODEL_ID]
  );
}

export function getImageModelCreditCost(modelId: string | undefined) {
  return getImageModelConfig(modelId).creditCost;
}

export function getOpenRouterImageModel(modelId: string | undefined) {
  return getImageModelConfig(modelId).openRouterModel;
}
