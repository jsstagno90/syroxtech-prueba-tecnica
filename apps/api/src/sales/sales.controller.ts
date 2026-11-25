import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createSaleSchema,
  idParamSchema,
  saleListQuerySchema,
  updateSaleStatusSchema,
  type AuthUser,
  type CreateSaleDto,
  type SaleListQuery,
  type UpdateSaleStatusDto,
} from '@admin/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { SalesService } from './sales.service.js';

/** Las ventas no se borran: se cancelan, para no perder la trazabilidad. */
@ApiTags('Ventas')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con búsqueda y filtros por estado' })
  findAll(@Query({ schema: saleListQuerySchema }) query: SaleListQuery) {
    return this.sales.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con ítems e historial de estados' })
  findOne(@Param('id', { schema: idParamSchema }) id: number) {
    return this.sales.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Genera una venta (el total se calcula en el servidor)' })
  create(@Body({ schema: createSaleSchema }) body: CreateSaleDto, @CurrentUser() user: AuthUser) {
    return this.sales.create(body, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambia el estado de la venta respetando el flujo permitido' })
  updateStatus(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateSaleStatusSchema }) body: UpdateSaleStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.sales.updateStatus(id, body, user);
  }
}
