import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { loginSchema, type AuthUser, type LoginDto } from '@admin/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT' })
  login(@Body({ schema: loginSchema }) body: LoginDto) {
    return this.auth.login(body);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Usuario de la sesión actual' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
