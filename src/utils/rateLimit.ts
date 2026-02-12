interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const currentTime = () => Date.now();

const getEntry = (key: string): RateLimitEntry => {
  const existing = rateLimitStore.get(key);
  if (existing) {
    return existing;
  }

  const fresh: RateLimitEntry = {
    count: 0,
    windowStartedAt: currentTime(),
    blockedUntil: 0,
  };
  rateLimitStore.set(key, fresh);
  return fresh;
};

const cleanupStore = () => {
  const now = currentTime();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.blockedUntil <= now && value.count === 0) {
      rateLimitStore.delete(key);
    }
  }
};

export const consumeRateLimit = (key: string, options: RateLimitOptions): RateLimitResult => {
  const now = currentTime();
  const entry = getEntry(key);

  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  if (now - entry.windowStartedAt >= options.windowMs) {
    entry.count = 0;
    entry.windowStartedAt = now;
    entry.blockedUntil = 0;
  }

  entry.count += 1;

  if (entry.count > options.maxAttempts) {
    entry.blockedUntil = now + options.blockDurationMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(options.blockDurationMs / 1000),
    };
  }

  const remaining = Math.max(0, options.maxAttempts - entry.count);
  if (remaining === 0) {
    entry.count = options.maxAttempts;
  }

  if (rateLimitStore.size > 5000) {
    cleanupStore();
  }

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0,
  };
};

export const clearRateLimit = (key: string) => {
  rateLimitStore.delete(key);
};

export const getClientIdentifier = (request: Request): string => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) {
    return cfIp;
  }

  return 'unknown-client';
};
