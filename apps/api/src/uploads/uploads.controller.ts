import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { uploadImageSchema, type UploadImageDto, type UploadImageResponse } from '@admin/shared';
import { Public } from '../common/decorators/public.decorator.js';
import type { Env } from '../config/env.js';
import { UploadsService } from './uploads.service.js';

const imageIdSchema = z.uuid('Imagen inexistente');

@ApiTags('Imágenes')
@Controller('uploads/images')
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sube una imagen (JPG, PNG o WebP, hasta 3 MB) y devuelve su URL pública' })
  async upload(@Body({ schema: uploadImageSchema }) body: UploadImageDto, @Req() req: Request): Promise<UploadImageResponse> {
    const { id } = await this.uploads.saveImage(body);
    const base = this.config.get('PUBLIC_URL', { infer: true }) ?? `${req.protocol}://${req.get('host')}`;
    return { url: `${base.replace(/\/$/, '')}/api/uploads/images/${id}` };
  }

  /** Pública para que la tienda pueda mostrarlas. No cambian nunca, así que se cachean por un año. */
  @Public()
  @Get(':id')
  async show(@Param('id', { schema: imageIdSchema }) id: string, @Res() res: Response) {
    const image = await this.uploads.getImage(id);
    res
      .set({
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(Buffer.from(image.data));
  }
}
