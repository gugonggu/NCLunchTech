interface SupabaseErrorLike {
  message: string;
}

export function requireQuerySuccess(error: SupabaseErrorLike | null, message: string): void {
  if (error) {
    throw new Error(message);
  }
}

export function requireQueryData<T>(data: T | null, error: SupabaseErrorLike | null, message: string): T {
  requireQuerySuccess(error, message);
  if (data === null) {
    throw new Error(message);
  }
  return data;
}

export function requireAffectedRow<T>(
  data: T | null,
  error: SupabaseErrorLike | null,
  notFoundMessage: string,
  errorMessage: string
): T {
  requireQuerySuccess(error, errorMessage);
  if (data === null) {
    throw new Error(notFoundMessage);
  }
  return data;
}
