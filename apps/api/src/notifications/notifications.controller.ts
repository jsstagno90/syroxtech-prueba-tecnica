import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { notificationListQuerySchema, type AuthUser, type NotificationListQuery } from '@admin/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Cantidad de nuevas y las últimas, para la campanita' })
  summary(@CurrentUser() user: AuthUser) {
    return this.notifications.summary(user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query({ schema: notificationListQuerySchema }) query: NotificationListQuery) {
    return this.notifications.findAll(user.id, query);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca todas como leídas' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}
