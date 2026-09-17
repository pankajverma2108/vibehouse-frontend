import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TaxBreakdown {
  /** Percent rate applied (e.g. 5 means 5%). */
  tax_rate_pct: number;
  /** Pre-tax base the rate was applied to (rupees). */
  taxable_amount: number;
  /** Computed tax (rupees, rounded to paise). */
  tax_amount: number;
  /** Convenience = taxable_amount + tax_amount. */
  total_with_tax: number;
}

/**
 * Per-property tax compute. Single-rate model for now (one `tax_rate_pct` per
 * property, applied uniformly to whatever pre-tax amount is passed in). Used
 * by:
 *   - guest booking flow → to inflate room+addon totals before charging.
 *   - payment service     → to derive the Razorpay order amount.
 *   - admin tax endpoints → to read/update the rate.
 *
 * When passing a `rateOverride`, the caller is using a previously-snapshotted
 * rate (e.g. from `ezee_booking_cache.tax_rate_pct`) so the booking total
 * stays stable even if ops edits the property's rate between order creation
 * and payment capture.
 */
@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Live rate for a property. Throws if the property doesn't exist. */
  async getTaxRate(propertyId: string): Promise<number> {
    const property = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { tax_rate_pct: true },
    });
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    return Number(property.tax_rate_pct);
  }

  /**
   * Compute the tax owed on a pre-tax amount for a property. Pass
   * `rateOverride` to apply a snapshotted rate instead of the live one
   * (preferred for any flow that already captured the rate at order time).
   */
  async computeTax(
    propertyId: string,
    taxableAmount: number,
    rateOverride?: number,
  ): Promise<TaxBreakdown> {
    const taxRatePct = rateOverride ?? (await this.getTaxRate(propertyId));
    return this.applyRate(taxableAmount, taxRatePct);
  }

  /**
   * Pure compute helper — no DB. Useful when the caller already has the rate
   * in hand (most flows do, since they're working from the cache snapshot).
   */
  applyRate(taxableAmount: number, taxRatePct: number): TaxBreakdown {
    const taxAmount = this.round2(taxableAmount * (taxRatePct / 100));
    return {
      tax_rate_pct: taxRatePct,
      taxable_amount: this.round2(taxableAmount),
      tax_amount: taxAmount,
      total_with_tax: this.round2(taxableAmount + taxAmount),
    };
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
