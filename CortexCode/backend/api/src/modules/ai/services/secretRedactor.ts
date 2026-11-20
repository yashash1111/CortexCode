/**
 * Redacts API keys, bearer tokens, and query-string credentials from logs,
 * error messages, and monitoring payloads.
 */
const SECRET_ENV_KEYS = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'CLOUDFLARE_API_TOKEN',
  'OPENAI_API_KEY',
  'CEREBRAS_API_KEY',
  'ANTHROPIC_API_KEY',
  'HUGGINGFACE_API_KEY',
  'HF_TOKEN',
  'AI_SERVICE_TOKEN',
];

const TOKEN_PATTERNS: RegExp[] = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /gsk_[0-9A-Za-z]{20,}/g,
  /sk-or-[A-Za-z0-9_-]{16,}/g,
  /sk-proj-[A-Za-z0-9_-]{16,}/g,
  /sk-ant-[A-Za-z0-9_-]{16,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /hf_[A-Za-z0-9]{16,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /([?&]key=)[^&\s"']+/gi,
];

export function redactSecrets(input: unknown): string {
  let text = typeof input === 'string' ? input : input instanceof Error ? input.message : String(input ?? '');
  if (!text) return '';

  // Redact exact configured env secret values first
  for (const envName of SECRET_ENV_KEYS) {
    const val = process.env[envName]?.trim();
    if (val && val.length >= 8 && val !== 'dummy') {
      text = text.split(val).join('[REDACTED]');
    }
  }

  // Redact known provider key/token patterns
  for (const pattern of TOKEN_PATTERNS) {
    text = text.replace(pattern, (match, group1) => {
      if (typeof group1 === 'string' && group1.includes('key=')) {
        return `${group1}[REDACTED]`;
      }
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED]';
      }
      return '[REDACTED]';
    });
  }

  return text;
}
