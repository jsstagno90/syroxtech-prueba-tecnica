import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  brandListQuerySchema,
  createBrandSchema,
  idParamSchema,
  updateBrandSchema,
  type BrandListQuery,
  type CreateBrandDto,
  type UpdateBrandDto,
} from '@admin/shared';
import { BrandsService } from './brands.service.js';

@ApiTags('Marcas')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  findAll(@Query({ schema: brandListQuerySchema }) query: BrandListQuery) {
    return this.brands.findAll(query);
  }

  @Get('options')
  findOptions() {
    return this.brands.findOptions();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idParamSchema }) id: number) {
    return this.brands.findOne(id);
  }

  @Post()
  create(@Body({ schema: createBrandSchema }) body: CreateBrandDto) {
    return this.brands.create(body);
  }

  @Patch(':id')
  update(@Param('id', { schema: idParamSchema }) id: number, @Body({ schema: updateBrandSchema }) body: UpdateBrandDto) {
    return this.brands.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.brands.remove(id);
  }
}
