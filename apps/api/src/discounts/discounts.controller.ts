import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createDiscountSchema,
  discountListQuerySchema,
  idParamSchema,
  updateDiscountSchema,
  type CreateDiscountDto,
  type DiscountListQuery,
  type UpdateDiscountDto,
} from '@admin/shared';
import { DiscountsService } from './discounts.service.js';

@ApiTags('Descuentos')
@ApiBearerAuth()
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get()
  @ApiOperation({ summary: 'Cupones con su estado (vigente, programado, vencido, agotado o pausado)' })
  findAll(@Query({ schema: discountListQuerySchema }) query: DiscountListQuery) {
    return this.discounts.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Cupones vigentes, para aplicar al generar una venta' })
  findOptions() {
    return this.discounts.findOptions();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idParamSchema }) id: number) {
    return this.discounts.findOne(id);
  }

  @Post()
  create(@Body({ schema: createDiscountSchema }) body: CreateDiscountDto) {
    return this.discounts.create(body);
  }

  @Patch(':id')
  update(@Param('id', { schema: idParamSchema }) id: number, @Body({ schema: updateDiscountSchema }) body: UpdateDiscountDto) {
    return this.discounts.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.discounts.remove(id);
  }
}
