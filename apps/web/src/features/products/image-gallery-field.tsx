'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Link2, Loader2, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_PRODUCT_IMAGES, UPLOAD_IMAGE_TYPES, type UploadImageResponse } from '@admin/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { ProductThumb } from './product-thumb';

/** Las fotos se achican antes de subirlas: ahorra datos y espacio en la base. */
const MAX_SIDE = 1600;
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;

async function toCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/webp', 0.85);
}

interface ImageGalleryFieldProps {
  value: string[];
  onChange: (images: string[]) => void;
  error?: string;
}

/**
 * Galería del producto: se suben archivos (o se pega una URL) y la primera imagen es la principal.
 * Se usa con un Controller de react-hook-form.
 */
export function ImageGalleryField({ value, onChange, error }: ImageGalleryFieldProps) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const free = MAX_PRODUCT_IMAGES - value.length;

  const upload = async (files: File[]) => {
    const accepted = files.filter((file) => {
      if (!(UPLOAD_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`${file.name}: usá JPG, PNG o WebP`);
        return false;
      }
      if (file.size > MAX_ORIGINAL_BYTES) {
        toast.error(`${file.name}: pesa más de 15 MB`);
        return false;
      }
      return true;
    });
    if (accepted.length > free) toast.warning(`Se suben las primeras ${free}: el máximo es ${MAX_PRODUCT_IMAGES} imágenes`);
    const batch = accepted.slice(0, Math.max(0, free));
    if (!batch.length) return;

    setUploading(batch.length);
    const uploaded: string[] = [];
    for (const file of batch) {
      try {
        const { url: uploadedUrl } = await apiClient.post<UploadImageResponse>('uploads/images', {
          dataUrl: await toCompressedDataUrl(file),
        });
        uploaded.push(uploadedUrl);
      } catch (uploadError) {
        toast.error(`${file.name}: ${uploadError instanceof Error ? uploadError.message : 'no se pudo subir'}`);
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  };

  const addUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/\S+$/.test(trimmed)) {
      toast.error('Pegá una URL que empiece con https://');
      return;
    }
    if (value.includes(trimmed)) {
      toast.info('Esa imagen ya está en la galería');
      return;
    }
    onChange([...value, trimmed]);
    setUrl('');
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void upload([...event.dataTransfer.files]);
  };

  return (
    <div className="grid gap-3" data-invalid={!!error || undefined}>
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Imágenes del producto">
          {value.map((src, index) => (
            <li key={src} className="group bg-muted/40 relative aspect-square overflow-hidden rounded-lg border">
              <ProductThumb src={src} alt={`Imagen ${index + 1}`} className="size-full rounded-none border-0 [&_svg]:size-6" />
              {index === 0 && <Badge className="absolute top-1.5 left-1.5 shadow-sm">Principal</Badge>}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="size-7 shadow-sm"
                    onClick={() => onChange([src, ...value.filter((item) => item !== src)])}
                    aria-label={`Usar la imagen ${index + 1} como principal`}
                    title="Usar como principal"
                  >
                    <Star />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 shadow-sm"
                  onClick={() => onChange(value.filter((item) => item !== src))}
                  aria-label={`Quitar la imagen ${index + 1}`}
                  title="Quitar"
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'grid place-items-center gap-2 rounded-lg border border-dashed p-5 text-center transition-colors',
          dragging && 'border-primary bg-primary/5',
          error && 'border-destructive',
        )}
      >
        <ImagePlus className="text-muted-foreground size-6" />
        <p className="text-muted-foreground text-xs">Arrastrá las fotos acá o</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={free <= 0 || uploading > 0}
          onClick={() => fileInput.current?.click()}
        >
          {uploading > 0 ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {uploading > 0 ? `Subiendo ${uploading}...` : 'Subir imágenes'}
        </Button>
        <p className="text-muted-foreground text-xs">
          JPG, PNG o WebP · hasta {MAX_PRODUCT_IMAGES} imágenes ({value.length}/{MAX_PRODUCT_IMAGES})
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={UPLOAD_IMAGE_TYPES.join(',')}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Elegir imágenes"
          onChange={(event) => {
            void upload([...(event.target.files ?? [])]);
            event.target.value = '';
          }}
        />
      </div>

      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          URL de una imagen
        </label>
        <Input
          id={inputId}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addUrl();
            }
          }}
          placeholder="O pegá la URL de una imagen"
          disabled={free <= 0}
        />
        <Button type="button" variant="outline" onClick={addUrl} disabled={free <= 0 || !url.trim()}>
          <Link2 /> Agregar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
