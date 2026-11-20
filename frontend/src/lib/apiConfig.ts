export const getApiUrl = (): string => {
  // If in the browser, always use same-origin relative URL so Next.js App Router API routes handle requests directly
  if (typeof window !== 'undefined') {
    return '';
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL || (typeof process !== 'undefined' && process.env ? process.env.VITE_API_URL : undefined);
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/$/, '');
  }
  
  return 'http://localhost:3000';
};
