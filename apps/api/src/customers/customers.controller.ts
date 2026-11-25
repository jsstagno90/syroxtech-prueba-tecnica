import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { customerListQuerySchema, type CustomerListQuery } from '@admin/shared';
import { CustomersService } from './customers.service.js';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('customers')
  @ApiOperation({ summary: 'Clientes armados a partir de sus ventas, con gasto, nivel de membresía y puntos' })
  findAll(@Query({ schema: customerListQuerySchema }) query: CustomerListQuery) {
    return this.customers.findAll(query);
  }

  @Get('loyalty')
  @ApiOperation({ summary: 'Resumen del programa de puntos' })
  loyalty() {
    return this.customers.loyaltySummary();
  }
}
