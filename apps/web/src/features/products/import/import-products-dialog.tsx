'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PRODUCT_IMPORT_FIELDS,
  guessColumnMapping,
  type ImportProductsResponse,
  type ProductImportField,
  type ProductImportIssue,
  type ProductImportRow,
  type ProductImportRowStatus,
} from '@admin/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { brandHooks } from '@/features/brands/api';
import { buildCategoryPaths, categoryHooks } from '@/features/categories/api';
import { cn } from '@/lib/utils';
import {
  applyMapping,
  columnLetter,
  downloadTemplate,
  readSpreadsheet,
  sampleValue,
  type CellValue,
  type ColumnMapping,
  type ParsedSpreadsheet,
} from './spreadsheet';
import { useImportProducts } from './use-import-products';

type Step = 'upload' | 'mapping' | 'review';

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Archivo' },
  { id: 'mapping', label: 'Columnas' },
  { id: 'review', label: 'Revisión' },
];

const SKIP = 'skip';

/** Correcciones hechas a mano en la revisión, por número de fila. */
type RowOverrides = Record<number, Partial<Record<ProductImportField, CellValue>>>;

const FIELD_LABELS = Object.fromEntries(PRODUCT_IMPORT_FIELDS.map((field) => [field.key, field.label])) as Record<
  ProductImportField,
  string
>;

/**
 * Importación de productos desde Excel/CSV en 3 pasos:
 * 1. subir el archivo, 2. elegir qué columna corresponde a cada campo, 3. revisar la validación y confirmar.
 */
export function ImportProductsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<Step>('upload');
  const [sheet, setSheet] = useState<ParsedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [createMissingBrands, setCreateMissingBrands] = useState(true);
  const [preview, setPreview] = useState<ImportProductsResponse | null>(null);
  const [overrides, setOverrides] = useState<RowOverrides>({});
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  /** Hay correcciones que la API todavía no validó. */
  const [dirty, setDirty] = useState(false);
  const importProducts = useImportProducts();

  const baseRows = useMemo(() => (sheet && mapping ? applyMapping(sheet, mapping) : []), [sheet, mapping]);
  // Filas que se mandan: las del archivo, sin las omitidas y con las correcciones aplicadas.
  const effectiveRows = useMemo<ProductImportRow[]>(
    () =>
      baseRows
        .filter((row) => !skipped.has(row.rowNumber))
        .map((row) => ({ ...row, ...overrides[row.rowNumber] })),
    [baseRows, skipped, overrides],
  );

  const clearCorrections = () => {
    setOverrides({});
    setSkipped(new Set());
    setDirty(false);
  };

  const reset = () => {
    setStep('upload');
    setSheet(null);
    setMapping(null);
    setPreview(null);
    setCreateMissingBrands(true);
    clearCorrections();
    importProducts.reset();
  };

  const setOverride = (rowNumber: number, field: ProductImportField, value: CellValue) => {
    setOverrides((current) => ({ ...current, [rowNumber]: { ...current[rowNumber], [field]: value } }));
    setDirty(true);
  };

  const toggleSkip = (rowNumber: number) => {
    setSkipped((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
    setDirty(true);
  };

  const close = (next: boolean) => {
    if (importProducts.isPending) return;
    onOpenChange(next);
    if (!next) setTimeout(reset, 200); // después de la animación de cierre
  };

  const onFileLoaded = (parsed: ParsedSpreadsheet) => {
    setSheet(parsed);
    setMapping(guessColumnMapping(parsed.headers));
    setStep('mapping');
  };

  const runImport = async (dryRun: boolean) => {
    if (!effectiveRows.length) {
      toast.error('No quedan filas para importar');
      return;
    }
    try {
      const result = await importProducts.mutateAsync({ dryRun, createMissingBrands, rows: effectiveRows });
      if (dryRun) {
        setPreview(result);
        setDirty(false);
        setStep('review');
        return;
      }
      const { toCreate, toUpdate, newBrands } = result.summary;
      toast.success(`Importación lista: ${toCreate} productos nuevos y ${toUpdate} actualizados`, {
        description: newBrands.length ? `Marcas creadas: ${newBrands.join(', ')}` : undefined,
      });
      close(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo procesar el archivo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <DialogDescription>Cargá muchos productos de una vez desde un Excel o CSV.</DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} />

        {step === 'upload' && <UploadStep onLoaded={onFileLoaded} />}

        {step === 'mapping' && sheet && mapping && (
          <MappingStep
            sheet={sheet}
            mapping={mapping}
            onChange={(next) => {
              setMapping(next);
              clearCorrections(); // si cambian las columnas, las correcciones anteriores ya no aplican
            }}
            createMissingBrands={createMissingBrands}
            onCreateMissingBrandsChange={setCreateMissingBrands}
            onBack={reset}
            onNext={() => runImport(true)}
            loading={importProducts.isPending}
          />
        )}

        {step === 'review' && preview && (
          <ReviewStep
            preview={preview}
            rows={effectiveRows}
            overrides={overrides}
            onOverride={setOverride}
            skippedCount={skipped.size}
            onSkip={toggleSkip}
            onRestoreSkipped={() => {
              setSkipped(new Set());
              setDirty(true);
            }}
            dirty={dirty}
            onRevalidate={() => runImport(true)}
            onBack={() => setStep('mapping')}
            onConfirm={() => runImport(false)}
            loading={importProducts.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2">
          {index > 0 && <span className="bg-border h-px w-6" aria-hidden />}
          <span
            className={cn(
              'grid size-6 place-items-center rounded-full border text-xs font-medium',
              index < currentIndex && 'bg-primary text-primary-foreground border-primary',
              index === currentIndex && 'border-primary text-foreground',
              index > currentIndex && 'text-muted-foreground',
            )}
          >
            {index + 1}
          </span>
          <span className={cn(index === currentIndex ? 'font-medium' : 'text-muted-foreground')}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------- Paso 1 -------------------------------- */

function UploadStep({ onLoaded }: { onLoaded: (sheet: ParsedSpreadsheet) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { data: categories = [] } = categoryHooks.useOptions();
  const { data: brands = [] } = brandHooks.useOptions();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      onLoaded(await readSpreadsheet(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo leer el archivo');
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  const onDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const paths = buildCategoryPaths(categories).map((category) => category.path.replace(/ › /g, ' > '));
      await downloadTemplate(paths, brands.map((brand) => brand.name));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={reading}
        className={cn(
          'hover:border-primary/50 hover:bg-muted/40 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragging && 'border-primary bg-muted/60',
        )}
      >
        {reading ? (
          <Loader2 className="text-muted-foreground size-10 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-10" />
        )}
        <div>
          <p className="font-medium">{reading ? 'Leyendo archivo...' : 'Arrastrá tu archivo acá o hacé click para elegirlo'}</p>
          <p className="text-muted-foreground text-sm">Excel (.xlsx) o CSV · hasta 1000 productos</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <div className="bg-muted/40 flex flex-col items-start justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium">¿No tenés un archivo armado?</p>
            <p className="text-muted-foreground">
              Bajá la plantilla con las columnas, ejemplos y la lista de categorías y marcas válidas. Si usás tu propio
              archivo, en el paso siguiente elegís qué columna es cada dato.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onDownloadTemplate} disabled={downloading} className="shrink-0">
          {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          Descargar plantilla
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Paso 2 -------------------------------- */

interface MappingStepProps {
  sheet: ParsedSpreadsheet;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  createMissingBrands: boolean;
  onCreateMissingBrandsChange: (value: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}

function MappingStep({
  sheet,
  mapping,
  onChange,
  createMissingBrands,
  onCreateMissingBrandsChange,
  onBack,
  onNext,
  loading,
}: MappingStepProps) {
  const missingRequired = PRODUCT_IMPORT_FIELDS.filter((field) => field.required && mapping[field.key] === null);

  // Una misma columna no puede alimentar dos campos.
  const duplicated = useMemo(() => {
    const counts = new Map<number, number>();
    Object.values(mapping).forEach((column) => column !== null && counts.set(column, (counts.get(column) ?? 0) + 1));
    return new Set([...counts].filter(([, count]) => count > 1).map(([column]) => column));
  }, [mapping]);

  const canContinue = missingRequired.length === 0 && duplicated.size === 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-emerald-600" />
          <span className="font-medium">{sheet.fileName}</span>
          <span className="text-muted-foreground">
            · {sheet.rows.length} filas · {sheet.headers.length} columnas
          </span>
        </span>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RefreshCw /> Cambiar archivo
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        Elegí qué columna de tu archivo corresponde a cada dato. Las propuse según los encabezados; las columnas que no
        elijas se ignoran.
      </p>

      <div className="max-h-[45vh] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Dato del producto</TableHead>
              <TableHead>Columna de tu archivo</TableHead>
              <TableHead>Ejemplo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PRODUCT_IMPORT_FIELDS.map((field) => {
              const column = mapping[field.key];
              const sample = sampleValue(sheet, column);
              const isDuplicated = column !== null && duplicated.has(column);
              return (
                <TableRow key={field.key}>
                  <TableCell className="font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </TableCell>
                  <TableCell className="min-w-56">
                    <Select
                      value={column === null ? SKIP : String(column)}
                      onValueChange={(value) => onChange({ ...mapping, [field.key]: value === SKIP ? null : Number(value) })}
                    >
                      <SelectTrigger
                        aria-label={`Columna para ${field.label}`}
                        aria-invalid={(field.required && column === null) || isDuplicated}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>{field.required ? 'Elegí una columna' : 'No importar'}</SelectItem>
                        {sheet.headers.map((header, index) => (
                          <SelectItem key={index} value={String(index)}>
                            <span className="text-muted-foreground font-mono text-xs">{columnLetter(index)}</span> {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isDuplicated && <p className="text-destructive mt-1 text-xs">Esta columna ya está usada en otro dato</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-48 truncate" title={sample === null ? '' : String(sample)}>
                    {sample === null ? '—' : String(sample)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="create-brands"
          checked={createMissingBrands}
          onCheckedChange={(checked) => onCreateMissingBrandsChange(checked === true)}
        />
        <Label htmlFor="create-brands" className="font-normal">
          Crear las marcas que todavía no existan
        </Label>
      </div>

      {missingRequired.length > 0 && (
        <p className="text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="size-4" />
          Falta elegir la columna de: {missingRequired.map((field) => field.label).join(', ')}
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft /> Atrás
        </Button>
        <Button onClick={onNext} disabled={!canContinue || loading}>
          {loading && <Loader2 className="animate-spin" />}
          Revisar {sheet.rows.length} filas
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------- Paso 3 -------------------------------- */

const STATUS_BADGE: Record<ProductImportRowStatus, { label: string; variant: 'success' | 'info' | 'danger' }> = {
  create: { label: 'Nuevo', variant: 'success' },
  update: { label: 'Se actualiza', variant: 'info' },
  error: { label: 'Con errores', variant: 'danger' },
};

interface ReviewStepProps {
  preview: ImportProductsResponse;
  /** Filas actuales (con correcciones), para mostrar el valor que se está editando. */
  rows: ProductImportRow[];
  overrides: RowOverrides;
  onOverride: (rowNumber: number, field: ProductImportField, value: CellValue) => void;
  skippedCount: number;
  onSkip: (rowNumber: number) => void;
  onRestoreSkipped: () => void;
  dirty: boolean;
  onRevalidate: () => void;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function ReviewStep({
  preview,
  rows,
  overrides,
  onOverride,
  skippedCount,
  onSkip,
  onRestoreSkipped,
  dirty,
  onRevalidate,
  onBack,
  onConfirm,
  loading,
}: ReviewStepProps) {
  const [onlyErrors, setOnlyErrors] = useState(preview.summary.withErrors > 0);
  const { toCreate, toUpdate, withErrors, newBrands } = preview.summary;
  const importable = toCreate + toUpdate;
  const rowsByNumber = useMemo(() => new Map(rows.map((row) => [row.rowNumber, row])), [rows]);
  const visible = preview.rows.filter(
    (row) => rowsByNumber.has(row.rowNumber) && (!onlyErrors || row.status === 'error'),
  );

  const { data: categories = [] } = categoryHooks.useOptions();
  const { data: brands = [] } = brandHooks.useOptions();
  const fixerOptions = useMemo(
    () => ({
      category: buildCategoryPaths(categories).map((category) => category.path.replace(/ › /g, ' > ')),
      brand: brands.map((brand) => brand.name),
    }),
    [categories, brands],
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryCard label="Productos nuevos" value={toCreate} className="text-emerald-600" />
        <SummaryCard label="Se actualizan (SKU existente)" value={toUpdate} className="text-blue-600" />
        <SummaryCard label="Con errores (no se importan)" value={withErrors} className={withErrors ? 'text-red-600' : undefined} />
      </div>

      {newBrands.length > 0 && (
        <p className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
          Se van a crear {newBrands.length === 1 ? 'la marca' : 'las marcas'}: <strong>{newBrands.join(', ')}</strong>
        </p>
      )}

      {withErrors > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Wand2 className="mt-0.5 size-4 shrink-0" />
          <span>
            Podés corregir los errores acá mismo (sin tocar el archivo) u omitir esas filas. Después tocá{' '}
            <strong>Aplicar correcciones</strong> para volver a validarlas.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {withErrors > 0 ? (
          <div className="flex items-center gap-2">
            <Checkbox id="only-errors" checked={onlyErrors} onCheckedChange={(checked) => setOnlyErrors(checked === true)} />
            <Label htmlFor="only-errors" className="font-normal">
              Ver solo las filas con errores
            </Label>
          </div>
        ) : (
          <span />
        )}
        {skippedCount > 0 && (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={onRestoreSkipped}>
            <Undo2 /> {skippedCount} {skippedCount === 1 ? 'fila omitida' : 'filas omitidas'} · restaurar
          </Button>
        )}
      </div>

      <div className="max-h-[42vh] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14">Fila</TableHead>
              <TableHead className="w-48">Producto</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-600" />
                  No quedan filas con errores.
                </TableCell>
              </TableRow>
            )}
            {visible.map((result) => {
              const current = rowsByNumber.get(result.rowNumber)!;
              const edited = Object.keys(overrides[result.rowNumber] ?? {}).length > 0;
              return (
                <TableRow key={result.rowNumber} className="align-top">
                  <TableCell className="text-muted-foreground pt-3.5 tabular-nums">{result.rowNumber}</TableCell>
                  <TableCell className="max-w-48 truncate pt-3.5 font-medium">
                    {(current.name as string | null) ?? result.name ?? <span className="text-muted-foreground">Sin nombre</span>}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_BADGE[result.status].variant}>{STATUS_BADGE[result.status].label}</Badge>
                      {edited && <Badge variant="warning">Editado{dirty ? ' · sin validar' : ''}</Badge>}
                    </div>
                    {result.errors.length > 0 && (
                      <div className="mt-2 grid gap-3">
                        {result.errors.map((issue, index) => (
                          <IssueFixer
                            key={`${issue.field}-${index}`}
                            issue={issue}
                            value={current[issue.field] ?? null}
                            options={issue.field === 'category' || issue.field === 'brand' ? fixerOptions[issue.field] : undefined}
                            onChange={(value) => onOverride(result.rowNumber, issue.field, value)}
                          />
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="pt-2">
                    {result.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onSkip(result.rowNumber)}
                        aria-label={`Omitir la fila ${result.rowNumber}`}
                        title="Omitir esta fila"
                      >
                        <EyeOff />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DialogFooter className="items-center">
        {dirty && <p className="text-muted-foreground mr-auto text-xs">Hay cambios sin validar</p>}
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft /> Volver a las columnas
        </Button>
        {dirty ? (
          <Button onClick={onRevalidate} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Aplicar correcciones
          </Button>
        ) : (
          <Button onClick={onConfirm} disabled={importable === 0 || loading}>
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            Importar {importable} {importable === 1 ? 'producto' : 'productos'}
            {withErrors > 0 && importable > 0 && ` (se omiten ${withErrors})`}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

/** El control para corregir un error puntual: select con sugerencias, número o texto según el campo. */
function IssueFixer({
  issue,
  value,
  options,
  onChange,
}: {
  issue: ProductImportIssue;
  value: CellValue;
  options?: string[];
  onChange: (value: CellValue) => void;
}) {
  const label = FIELD_LABELS[issue.field];
  const message = (
    <p className="text-destructive text-xs">
      <strong>{label}:</strong> {issue.message}
    </p>
  );
  const suggestions = issue.suggestions ?? [];
  const textValue = value === null || value === undefined ? '' : String(value);

  let control;
  if (options || issue.field === 'isActive') {
    const all = options ?? ['Sí', 'No'];
    const rest = all.filter((option) => !suggestions.includes(option));
    control = (
      <Select value={all.includes(textValue) ? textValue : ''} onValueChange={onChange}>
        <SelectTrigger size="sm" className="h-8 max-w-72" aria-label={`Corregir ${label}`}>
          <SelectValue placeholder={suggestions.length ? `Sugerido: ${suggestions[0]}` : `Elegí ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {suggestions.length > 0 && (
            <SelectGroup>
              <SelectLabel>Sugeridas</SelectLabel>
              {suggestions.map((option) => (
                <SelectItem key={`s-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {suggestions.length > 0 && rest.length > 0 && <SelectSeparator />}
          {rest.length > 0 && (
            <SelectGroup>
              {suggestions.length > 0 && <SelectLabel>Todas</SelectLabel>}
              {rest.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    );
  } else {
    control = (
      <Input
        className="h-8 max-w-72"
        type={issue.field === 'price' ? 'number' : 'text'}
        inputMode={issue.field === 'price' ? 'decimal' : undefined}
        step={issue.field === 'price' ? '0.01' : undefined}
        placeholder={issue.field === 'price' ? 'Ej: 25000' : `Nuevo valor de ${label.toLowerCase()}`}
        defaultValue={issue.field === 'price' ? '' : textValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Corregir ${label}`}
      />
    );
  }

  return (
    <div className="grid gap-1.5">
      {message}
      {control}
      {suggestions.length > 0 && options && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                'hover:bg-accent rounded-md border px-2 py-0.5 text-xs transition-colors',
                textValue === option && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className={cn('text-2xl font-bold tabular-nums', className)}>{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
