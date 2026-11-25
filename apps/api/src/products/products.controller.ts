import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createProductSchema,
  idParamSchema,
  importProductsSchema,
  productListQuerySchema,
  updateProductSchema,
  type CreateProductDto,
  type ImportProductsDto,
  type ProductListQuery,
  type UpdateProductDto,
} from '@admin/shared';
import { ProductsImportService } from './import/products-import.service.js';
import { ProductsService } from './products.service.js';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly productsImport: ProductsImportService,
  ) {}

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

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Importa productos desde filas de un Excel/CSV ya mapeadas',
    description: 'Con dryRun=true solo valida y devuelve el resultado por fila; con dryRun=false guarda las filas válidas.',
  })
  import(@Body({ schema: importProductsSchema }) body: ImportProductsDto) {
    return this.productsImport.import(body);
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
