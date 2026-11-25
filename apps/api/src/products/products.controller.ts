import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createProductSchema,
  idParamSchema,
  productListQuerySchema,
  updateProductSchema,
  type CreateProductDto,
  type ProductListQuery,
  type UpdateProductDto,
} from '@admin/shared';
import { ProductsService } from './products.service.js';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con búsqueda y filtros por categoría, marca y estado' })
  findAll(@Query({ schema: productListQuerySchema }) query: ProductListQuery) {
    return this.products.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Productos activos (id, nombre, precio) para generar ventas' })
  findOptions() {
    return this.products.findOptions();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idParamSchema }) id: number) {
    return this.products.findOne(id);
  }

  @Post()
  create(@Body({ schema: createProductSchema }) body: CreateProductDto) {
    return this.products.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateProductSchema }) body: UpdateProductDto,
  ) {
    return this.products.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.products.remove(id);
  }
}
