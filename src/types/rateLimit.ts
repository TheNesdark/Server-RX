export interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
}

export interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}
