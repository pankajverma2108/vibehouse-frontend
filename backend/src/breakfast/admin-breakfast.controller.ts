import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { BreakfastService } from './breakfast.service';
import { BreakfastInviteService } from './breakfast-invite.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { AdminPlaceOrderDto } from './dto/admin-place-order.dto';
import { UpdateBreakfastConfigDto } from './dto/update-breakfast-config.dto';
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import type { AdminJwtPayload } from '../common/guards/admin-jwt.strategy';

/**
 * Admin breakfast console — menu catalog (add/remove, no stock), slot config, and order
 * tracking (which room ordered what + kitchen summary). Property-scoped via the actor's
 * active property; `breakfast.view` for reads, `breakfast.edit` for writes.
 */
@Controller('admin/breakfast')
@UseGuards(AdminJwtGuard, PermissionsGuard)
export class AdminBreakfastController {
  constructor(
    private readonly breakfast: BreakfastService,
    private readonly invites: BreakfastInviteService,
  ) {}

  // ──── PROPERTY TOGGLE ──────────────────────────────────────────────────────

  @Get('config')
  @RequirePermission('breakfast.view')
  getConfig(@CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.getConfig(actor);
  }

  @Put('config')
  @RequirePermission('breakfast.edit')
  setConfig(@Body() dto: UpdateBreakfastConfigDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.setConfig(actor, dto);
  }

  // ──── MENU CATALOG ─────────────────────────────────────────────────────────

  @Post('menu')
  @RequirePermission('breakfast.edit')
  createMenu(@Body() dto: CreateMenuItemDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.createMenuItem(dto, actor);
  }

  @Get('menu')
  @RequirePermission('breakfast.view')
  listMenu(@CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.listMenu(actor);
  }

  @Get('menu/:id')
  @RequirePermission('breakfast.view')
  getMenu(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.getMenuItem(id, actor);
  }

  @Patch('menu/:id')
  @RequirePermission('breakfast.edit')
  updateMenu(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.breakfast.updateMenuItem(id, dto, actor);
  }

  @Delete('menu/:id')
  @RequirePermission('breakfast.edit')
  removeMenu(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.removeMenuItem(id, actor);
  }

  // ──── SLOT CONFIG ──────────────────────────────────────────────────────────

  @Get('slots')
  @RequirePermission('breakfast.view')
  listSlots(@CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.listSlots(actor);
  }

  @Get('slots/summary')
  @RequirePermission('breakfast.view')
  slotSummary(@Query('date') date: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.slotSummary(actor, date);
  }

  @Post('slots')
  @RequirePermission('breakfast.edit')
  createSlot(@Body() dto: CreateSlotDto, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.createSlot(dto, actor);
  }

  @Patch('slots/:id')
  @RequirePermission('breakfast.edit')
  updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateSlotDto,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.breakfast.updateSlot(id, dto, actor);
  }

  @Delete('slots/:id')
  @RequirePermission('breakfast.edit')
  removeSlot(@Param('id') id: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.removeSlot(id, actor);
  }

  // ──── ORDER TRACKING ───────────────────────────────────────────────────────

  /**
   * Checked-in bookings roster for "place order for guest" — guest name, room, phone, adult cap
   * and current order status, so the admin picks from a list instead of looking up the eZee
   * reservation id in the DB.
   */
  @Get('bookings')
  @RequirePermission('breakfast.view')
  listBookings(@Query('date') date: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.listCheckedInBookings(actor, date);
  }

  @Get('orders')
  @RequirePermission('breakfast.view')
  listOrders(@Query('date') date: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.listOrders(actor, date);
  }

  @Get('forecast')
  @RequirePermission('breakfast.view')
  forecast(@Query('date') date: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.forecast(actor, date);
  }

  @Get('dashboard')
  @RequirePermission('breakfast.view')
  dashboard(@Query('date') date: string, @CurrentAdmin() actor: AdminJwtPayload) {
    return this.breakfast.dashboard(actor, date);
  }

  /**
   * The plates posted here are the ones the roster/board handed back, which carry read-only
   * fields (`plate_number`, `slot_label`, item `name`, …) the body doesn't declare. Strip them
   * rather than 400 the whole order — same reason as the Cx submit.
   */
  @Post('orders')
  @RequirePermission('breakfast.edit')
  placeOrder(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    dto: AdminPlaceOrderDto,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    return this.breakfast.adminPlaceOrder(dto, actor);
  }

  // ──── INVITES ──────────────────────────────────────────────────────────────

  @Post('invites/send')
  @RequirePermission('breakfast.edit')
  async sendInvites(
    @Query('property_id') propertyId: string,
    @CurrentAdmin() actor: AdminJwtPayload,
  ) {
    const target = propertyId || actor.property_id;
    if (!target || !actor.property_ids?.includes(target)) {
      return { ok: false, error: 'not_authorised_for_property' };
    }
    const result = await this.invites.sendForProperty(target);
    return { ok: true, property_id: target, ...result };
  }
}
