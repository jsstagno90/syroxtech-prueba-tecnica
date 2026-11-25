import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { statsQuerySchema, type StatsQuery } from '@admin/shared';
import { StatsService } from './stats.service.js';

@ApiTags('Estadísticas')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Indicadores y gráficos del período: 30 días, 90 días o 12 meses' })
  get(@Query({ schema: statsQuerySchema }) query: StatsQuery) {
    return this.stats.get(query);
  }
}
