/**
 * Configuración de la tienda. El panel es genérico: para otro e-commerce
 * alcanza con cambiar estas variables de entorno.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Tennis Star',
  locale: process.env.NEXT_PUBLIC_LOCALE ?? 'es-AR',
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? 'ARS',
  timeZone: process.env.NEXT_PUBLIC_TIME_ZONE ?? 'America/Argentina/Buenos_Aires',
};

/** Nombre de la cookie httpOnly donde vive el token de sesión. */
export const SESSION_COOKIE = 'admin_session';
