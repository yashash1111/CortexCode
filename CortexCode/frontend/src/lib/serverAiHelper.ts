/**
 * Centralized Server AI Helper for Next.js App Router API routes.
 * Routes requests through the CortexCode backend AI Gateway so all credentials
 * remain exclusively on the backend.
 */
export async function generateAiResponseServer(
  prompt: string,
  history: Array<{ role?: string; content: string }> = [],
  mode: string = 'chat'
): Promise<string> {
  const backendUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001';

  const res = await fetch(`${backendUrl}/api/demo/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt,
      history,
      mode,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.success || !payload?.data?.content) {
    throw new Error(
      payload?.error?.message ||
        'AI service is temporarily unavailable. Please try again shortly.'
    );
  }

  return payload.data.content;
}
