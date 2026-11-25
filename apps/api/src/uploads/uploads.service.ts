import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_UPLOAD_BYTES, type UploadImageDto } from '@admin/shared';
import { PrismaService } from '../prisma/prisma.service.js';

/** Firma de los primeros bytes de cada formato: no alcanza con confiar en el tipo declarado. */
const SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveImage({ dataUrl }: UploadImageDto): Promise<{ id: string }> {
    const [, mimeType, base64] = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl) ?? [];
    const bytes = Buffer.from(base64 ?? '', 'base64');
    if (!mimeType || !SIGNATURES[mimeType]?.(bytes)) {
      throw new BadRequestException('El archivo no es una imagen JPG, PNG o WebP válida');
    }
    if (bytes.length > MAX_UPLOAD_BYTES) throw new BadRequestException('La imagen pesa más de 3 MB');

    return this.prisma.uploadedImage.create({
      data: { mimeType, size: bytes.length, data: bytes },
      select: { id: true },
    });
  }

  async getImage(id: string) {
    const image = await this.prisma.uploadedImage.findUnique({ where: { id }, select: { mimeType: true, data: true } });
    if (!image) throw new NotFoundException('La imagen no existe');
    return image;
  }
}
