import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Check if it's a valid image data URI - allow these through without modification
  if (/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/i.test(input)) {
    return input;
  }
  
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Block dangerous data: URIs but allow image data URIs (checked above)
    .replace(/data:(?!image\/)/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many failed attempts, please try again after 1 hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { message: 'Too many uploads, please wait before uploading more' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function setupSecurityMiddleware(app: Express): void {
  const isProduction = process.env.NODE_ENV === "production";
  const isReplitEnv = !!process.env.REPL_SLUG;
  
  // In Replit dev environment, allow embedding in Replit's iframe for preview
  const frameAncestors = isReplitEnv && !isProduction
    ? ["'self'", "https://*.replit.dev", "https://*.replit.com", "https://replit.com"]
    : ["'self'"];
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.tiktok.com", "https://*.tiktok.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://ltcfqwtlmtyhcuntnpqs.supabase.co", "https://www.tiktok.com", "https://*.tiktok.com"],
        frameSrc: ["'self'", "https://www.tiktok.com", "https://*.tiktok.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "blob:"],
        childSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        frameAncestors: frameAncestors,
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // In Replit dev, don't set X-Frame-Options to allow iframe embedding
    if (isProduction || !isReplitEnv) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
}

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(s => s.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

export const registrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(s => s.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const noteSchema = z.object({
  note: z.string()
    .min(1, 'Note is required')
    .max(5000, 'Note too long')
    .transform(sanitizeString),
  campaignId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
});

export const issueReportSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(2000, 'Message too long')
    .transform(sanitizeString),
});

export const scoreAdjustmentSchema = z.object({
  delta: z.number()
    .int('Score change must be an integer')
    .min(-1000, 'Score change too low')
    .max(1000, 'Score change too high'),
  reason: z.string()
    .max(500, 'Reason too long')
    .optional()
    .transform(s => s ? sanitizeString(s) : undefined),
  displayReason: z.string()
    .max(50, 'Display reason must be 50 characters or less')
    .optional()
    .transform(s => s ? sanitizeString(s) : undefined),
});

export const shippingSchema = z.object({
  courier: z.string()
    .min(1, 'Courier is required')
    .max(100, 'Courier name too long')
    .transform(sanitizeString),
  trackingNumber: z.string()
    .min(1, 'Tracking number is required')
    .max(100, 'Tracking number too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid tracking number format'),
  trackingUrl: z.string()
    .url('Invalid tracking URL')
    .max(500, 'URL too long')
    .optional()
    .or(z.literal('')),
});

export const bulkApproveSchema = z.object({
  applicationIds: z.array(z.string().uuid())
    .min(1, 'At least one application is required')
    .max(100, 'Too many applications at once'),
});

export const csvUploadSchema = z.object({
  csvData: z.string()
    .min(1, 'CSV data is required')
    .max(1000000, 'CSV file too large'),
});

export const issueResponseSchema = z.object({
  response: z.string()
    .max(2000, 'Response too long')
    .optional()
    .transform(s => s ? sanitizeString(s) : undefined),
});

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function paramValidator(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName];
    if (paramValue && !validateUUID(paramValue)) {
      return res.status(400).json({ message: `Invalid ${paramName} format` });
    }
    next();
  };
}

export function logSecurityEvent(event: string, details: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} - ${event}:`, JSON.stringify(details));
}
