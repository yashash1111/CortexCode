export const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || (typeof process !== 'undefined' && process.env ? process.env.VITE_API_URL : undefined);
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If on render or remote deployment
    if (hostname.includes('onrender.com')) {
      return 'https://cortexcode-api.onrender.com';
    }
    // If local dev (localhost, 127.0.0.1, local IP)
    return `http://${hostname}:3001`;
  }
  
  return 'http://localhost:3001';
};
