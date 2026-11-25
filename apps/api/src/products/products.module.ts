import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsImportService } from './import/products-import.service.js';
import { ProductsService } from './products.service.js';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsImportService],
})
export class ProductsModule {}
