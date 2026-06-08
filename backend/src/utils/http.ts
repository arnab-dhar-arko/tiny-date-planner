export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireUser<T>(value: T | undefined): T {
  if (!value) throw new HttpError(401, "Authentication required");
  return value;
}
