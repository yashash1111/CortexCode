export interface ApiErrorLike {
  code?: string;
  message?: string;
  response?: {
    data?: {
      message?: string;
      error?: {
        message?: string;
        issues?: Array<{ message?: string }>;
      };
    };
  };
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && !('response' in err)) {
    return err.message || fallback;
  }
  const e = err as ApiErrorLike;
  return (
    e?.response?.data?.error?.message ||
    e?.response?.data?.message ||
    e?.message ||
    fallback
  );
}
