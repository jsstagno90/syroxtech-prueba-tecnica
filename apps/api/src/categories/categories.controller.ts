import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  categoryListQuerySchema,
  createCategorySchema,
  idParamSchema,
  updateCategorySchema,
  type CategoryListQuery,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from '@admin/shared';
import { CategoriesService } from './categories.service.js';

@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listado paginado con búsqueda y orden' })
  findAll(@Query({ schema: categoryListQuerySchema }) query: CategoryListQuery) {
    return this.categories.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Todas las categorías (id, nombre, padre) para selects' })
  findOptions() {
    return this.categories.findOptions();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idParamSchema }) id: number) {
    return this.categories.findOne(id);
  }

  @Post()
  create(@Body({ schema: createCategorySchema }) body: CreateCategoryDto) {
    return this.categories.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateCategorySchema }) body: UpdateCategoryDto,
  ) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.categories.remove(id);
  }
}
