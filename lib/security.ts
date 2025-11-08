/**
 * Security utilities for the CSV chat application
 */

/**
 * Sanitize SQL identifier (table/column name)
 * Only allows alphanumeric characters and underscores
 */
export function sanitizeSQLIdentifier(identifier: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, "_");

  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sanitized)) {
    return `_${sanitized}`;
  }

  // Limit length
  return sanitized.substring(0, 64);
}

/**
 * Escape SQL string literal
 */
export function escapeSQLString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Validate dataset ID format
 * Must be alphanumeric to prevent path traversal
 */
export function validateDatasetId(datasetId: string): boolean {
  return /^[a-z0-9]+$/.test(datasetId) && datasetId.length >= 10 && datasetId.length <= 50;
}

/**
 * Sanitize error message for client consumption
 * Removes file paths and stack traces
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred";
  }

  let message = error.message;

  // Remove file system paths
  message = message.replace(/\/[\w\/\.-]+/g, "[path]");
  message = message.replace(/[A-Z]:\\[\w\\\.-]+/g, "[path]");

  // Remove line numbers and stack info
  message = message.replace(/:\d+:\d+/g, "");
  message = message.replace(/at .+/g, "");

  // Generic messages for common errors
  if (message.includes("ENOENT")) {
    return "File not found";
  }
  if (message.includes("EACCES")) {
    return "Permission denied";
  }
  if (message.includes("Parse error")) {
    return "Failed to parse file. Please check the format.";
  }

  return message.substring(0, 200); // Limit length
}

/**
 * Generate cryptographically secure random ID
 */
export function generateSecureId(length: number = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for Node.js
    const nodeCrypto = require("crypto");
    nodeCrypto.randomFillSync(randomValues);
  }

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Filter out old requests
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      this.requests.set(identifier, timestamps);
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
    };
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter((ts) => ts > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}

// Global rate limiters
export const uploadRateLimiter = new RateLimiter(5, 60000); // 5 uploads per minute
export const queryRateLimiter = new RateLimiter(20, 60000); // 20 queries per minute

// Cleanup every 5 minutes
setInterval(() => {
  uploadRateLimiter.cleanup();
  queryRateLimiter.cleanup();
}, 300000);

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (when behind proxy)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to connection info (Next.js might not have this)
  return "unknown";
}

/**
 * Validate file content to prevent malicious uploads
 */
export function validateFileContent(buffer: Buffer, extension: string): { valid: boolean; error?: string } {
  // Check for null bytes (binary injection)
  if (buffer.includes(0)) {
    return { valid: false, error: "File contains invalid binary data" };
  }

  // Check file size
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (buffer.length > maxSize) {
    return { valid: false, error: "File too large" };
  }

  // Basic CSV validation
  if (extension === ".csv" || extension === ".tsv") {
    const content = buffer.toString("utf-8", 0, Math.min(10000, buffer.length));

    // Check for suspicious patterns
    if (content.includes("<?php") || content.includes("<script")) {
      return { valid: false, error: "File contains suspicious content" };
    }
  }

  return { valid: true };
}
