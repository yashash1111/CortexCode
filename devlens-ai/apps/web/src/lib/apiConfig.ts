export const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || (typeof process !== 'undefined' && process.env ? process.env.VITE_API_URL : undefined);
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }
  
  // In the browser, default to same-origin relative path so Next.js API routes handle requests directly
  if (typeof window !== 'undefined') {
    return '';
  }
  
  return 'http://localhost:3000';
};
