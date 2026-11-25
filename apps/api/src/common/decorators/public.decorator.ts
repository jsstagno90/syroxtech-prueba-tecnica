import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como pública: el guard global de autenticación la deja pasar. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
