/**
 * CortexCode AI Response Engine
 * Pure API Key-driven assistant error handlers and utilities.
 * All responses are generated directly from live LLM model providers (Gemini, Cerebras, OpenAI, Anthropic).
 */

export function getAPIErrorMessage(errorDetail?: string): string {
  if (errorDetail && errorDetail.trim()) {
    return `⚠️ **AI Provider Error**\n\n${errorDetail}\n\nPlease check your API key configuration in **Settings > API Keys** or verify your provider quota.`;
  }

  return `⚠️ **API Key Required**\n\nTo interact with CortexCode AI, a valid API key is required.\n\n### How to configure:\n1. Open **Settings > API Keys** (gear icon in the sidebar).\n2. Enter your **Google Gemini API Key** (get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey)) or **Cerebras API Key**.\n3. Click **Save Changes**.\n\nIf you are running on Render, you can also add \`GEMINI_API_KEY\` or \`CEREBRAS_API_KEY\` in your **Render Dashboard > Environment** variables.`;
}


