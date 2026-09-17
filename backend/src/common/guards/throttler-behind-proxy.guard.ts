import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit tracker keyed on the REAL client IP when running behind the ALB.
 *
 * The task sits behind a single AWS ALB, so the TCP peer (`req.ip`) is always
 * the load balancer — using it would lump every visitor into one bucket. The
 * trustworthy client IP is the LAST entry of `x-forwarded-for` (the one the ALB
 * itself appended); earlier entries can be forged by the caller, so we must not
 * read `[0]`.
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const xff = req?.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      const parts = xff
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    }
    return req?.ip ?? 'unknown';
  }
}
