export interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * Configurable model pricing (USD per 1M tokens).
 * Free-tier models (Gemini, Groq, Hugging Face) track nominal equivalent cost
 * or $0 when overridden via MODEL_PRICING_JSON.
 */
const DEFAULT_MODEL_PRICING: Record<string, ModelPrice> = {
  // Gemini
  'gemini-3.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini-3.5-flash-lite': { inputPerMillion: 0.075, outputPerMillion: 0.30 },
  'gemini-flash-latest': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10.0 },
  'gemini-embedding-001': { inputPerMillion: 0.02, outputPerMillion: 0.0 },
  'text-embedding-004': { inputPerMillion: 0.02, outputPerMillion: 0.0 },
  // Groq
  'llama-3.3-70b-versatile': { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  'llama-3.1-8b-instant': { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  'mixtral-8x7b-32768': { inputPerMillion: 0.24, outputPerMillion: 0.24 },
  // Hugging Face
  'Qwen/Qwen2.5-72B-Instruct': { inputPerMillion: 0.35, outputPerMillion: 0.40 },
  'meta-llama/Llama-3.1-8B-Instruct': { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  'BAAI/bge-large-en-v1.5': { inputPerMillion: 0.01, outputPerMillion: 0.0 },
  // OpenAI
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.0 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'text-embedding-3-small': { inputPerMillion: 0.02, outputPerMillion: 0.0 },
  'text-embedding-3-large': { inputPerMillion: 0.13, outputPerMillion: 0.0 },
  // Cerebras
  'llama-3.3-70b': { inputPerMillion: 0.85, outputPerMillion: 1.20 },
  'llama3.1-8b': { inputPerMillion: 0.10, outputPerMillion: 0.10 },
  // Anthropic
  'claude-3-5-sonnet-20240620': { inputPerMillion: 3.00, outputPerMillion: 15.0 },
};

function loadPricingTable(): Record<string, ModelPrice> {
  const raw = process.env.MODEL_PRICING_JSON;
  if (!raw) return DEFAULT_MODEL_PRICING;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MODEL_PRICING, ...parsed };
  } catch {
    console.warn('[ModelPricing] Invalid MODEL_PRICING_JSON, using defaults');
    return DEFAULT_MODEL_PRICING;
  }
}

export function estimateModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const table = loadPricingTable();
  const price = table[model] || { inputPerMillion: 0.15, outputPerMillion: 0.60 };
  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * price.inputPerMillion;
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * price.outputPerMillion;
  return Number((inputCost + outputCost).toFixed(8));
}
