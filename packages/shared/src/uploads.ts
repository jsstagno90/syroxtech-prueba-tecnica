import { z } from 'zod';

/** Tipos aceptados. SVG queda afuera a propósito: puede llevar scripts. */
export const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export const uploadImageSchema = z.object({
  /** La imagen como data URL (`data:image/webp;base64,...`). El panel la achica antes de mandarla. */
  dataUrl: z
    .string()
    .max(Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 100, 'La imagen pesa más de 3 MB')
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/, 'Formato no soportado: usá JPG, PNG o WebP'),
});

export type UploadImageDto = z.output<typeof uploadImageSchema>;

export interface UploadImageResponse {
  /** URL pública y permanente de la imagen. */
  url: string;
}
