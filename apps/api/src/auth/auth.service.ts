import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AuthUser, LoginDto, LoginResponse } from '@admin/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const SESSION_TTL = 60 * 60 * 8; // 8 horas
const REMEMBER_TTL = 60 * 60 * 24 * 30; // 30 días ("Mantener sesión iniciada")

/**
 * Hash de relleno: si el correo no existe igual comparamos contra algo,
 * así la respuesta tarda lo mismo y no se puede adivinar qué correos están registrados.
 */
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, password, remember }: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordOk) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const expiresIn = remember ? REMEMBER_TTL : SESSION_TTL;
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });

    return { accessToken, expiresIn, user: this.toAuthUser(user) };
  }

  /** Verifica el token y vuelve a leer el usuario: si lo borraron, el token deja de servir. */
  async authenticate(token: string): Promise<AuthUser> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o vencida');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Sesión inválida o vencida');
    return this.toAuthUser(user);
  }

  private toAuthUser(user: { id: number; email: string; name: string }): AuthUser {
    return { id: user.id, email: user.email, name: user.name };
  }
}
