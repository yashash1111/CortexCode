/**
 * CortexCode AI Response Engine — friendly error formatting for centralized AI.
 * Never prompts ordinary users for API keys.
 */
export function getAPIErrorMessage(errorDetail?: string): string {
  if (errorDetail) {
    return `⚠️ **AI Service Notice**\n\n${errorDetail}\n\nPlease try again in a moment.`;
  }
  return `⚠️ **AI Service Temporarily Unavailable**\n\nOur AI providers are currently experiencing high demand or temporary maintenance. Please try again in a few moments.`;
}
