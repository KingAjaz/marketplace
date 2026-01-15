/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiting for API routes
 * For production, consider using Redis-based rate limiting (e.g., @upstash/ratelimit)
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (for development/single-instance)
// For production with multiple instances, use Redis
const store: RateLimitStore = {}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000) // Clean up every minute

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.' } = config

  return async (identifier: string): Promise<{ success: boolean; remaining: number; resetTime: number; error?: string }> => {
    const now = Date.now()
    const key = identifier

    // Get or create entry
    let entry = store[key]

    if (!entry || entry.resetTime < now) {
      // Create new window
      entry = {
        count: 1,
        resetTime: now + windowMs,
      }
      store[key] = entry
      return {
        success: true,
        remaining: maxRequests - 1,
        resetTime: entry.resetTime,
      }
    }

    // Increment count
    entry.count++

    if (entry.count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
        error: message,
      }
    }

    return {
      success: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Strict rate limiter for auth endpoints (login, signup, password reset)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  }),

  // Moderate rate limiter for general API endpoints
  api: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.',
  }),

  // Strict rate limiter for payment/order endpoints
  payment: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 requests per 5 minutes
    message: 'Too many payment requests. Please try again in a few minutes.',
  }),

  // Very strict rate limiter for sensitive operations (refunds, account deletion)
  sensitive: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
    message: 'Too many sensitive operations. Please try again later.',
  }),

  // Lenient rate limiter for public endpoints (product browsing)
  public: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests. Please slow down.',
  }),
}

/**
 * Get identifier for rate limiting
 * Uses IP address for unauthenticated users, user ID for authenticated users
 */
export function getRateLimitIdentifier(request: Request, userId?: string | null): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try to get IP from headers (works with most proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return `ip:${ip}`
}

/**
 * Rate limit middleware helper
 * Returns a NextResponse with 429 status if rate limit exceeded
 */
export async function checkRateLimit(
  request: Request,
  limiter: ReturnType<typeof createRateLimiter>,
  userId?: string | null
) {
  const identifier = getRateLimitIdentifier(request, userId)
  const result = await limiter(identifier)

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: result.error || 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000), // seconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          },
        }
      ),
    }
  }

  return {
    success: true,
    remaining: result.remaining,
    resetTime: result.resetTime,
  }
}
