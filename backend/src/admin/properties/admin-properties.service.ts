import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminJwtPayload } from '../../common/guards/admin-jwt.strategy';
import { UpdatePropertyTaxDto } from './dto/update-property-tax.dto';

@Injectable()
export class AdminPropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(actor: AdminJwtPayload) {
    if (actor.property_ids.length === 0) return [];

    const properties = await this.prisma.properties.findMany({
      where: { id: { in: actor.property_ids } },
      select: {
        id: true,
        name: true,
        brand: true,
        city: true,
        branding_config: true,
        tax_rate_pct: true,
      },
      orderBy: { name: 'asc' },
    });

    return properties.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      city: p.city,
      branding_config: p.branding_config ?? {},
      tax_rate_pct: Number(p.tax_rate_pct),
    }));
  }

  async getForAdmin(actor: AdminJwtPayload, propertyId: string) {
    if (!actor.property_ids.includes(propertyId)) {
      throw new NotFoundException('Property not found');
    }

    const property = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        brand: true,
        city: true,
        branding_config: true,
        tax_rate_pct: true,
      },
    });

    if (!property) throw new NotFoundException('Property not found');

    return {
      ...property,
      branding_config: property.branding_config ?? {},
      tax_rate_pct: Number(property.tax_rate_pct),
    };
  }

  async getTax(actor: AdminJwtPayload, propertyId: string) {
    if (!actor.property_ids.includes(propertyId)) {
      throw new NotFoundException('Property not found');
    }
    const property = await this.prisma.properties.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, tax_rate_pct: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    return {
      property_id: property.id,
      property_name: property.name,
      tax_rate_pct: Number(property.tax_rate_pct),
    };
  }

  async updateTax(
    actor: AdminJwtPayload,
    propertyId: string,
    dto: UpdatePropertyTaxDto,
  ) {
    if (!actor.property_ids.includes(propertyId)) {
      throw new ForbiddenException('Not authorised for this property');
    }
    const updated = await this.prisma.properties.update({
      where: { id: propertyId },
      data: { tax_rate_pct: dto.tax_rate_pct },
      select: { id: true, name: true, tax_rate_pct: true },
    });
    return {
      property_id: updated.id,
      property_name: updated.name,
      tax_rate_pct: Number(updated.tax_rate_pct),
    };
  }
}
