import { z } from 'zod';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import prisma from '../lib/prisma.js';

const VALID_INHERITANCE = [
  'autosomal_dominant',
  'autosomal_recessive',
  'x_linked',
  'x_linked_recessive',
  'x_linked_dominant',
  'mitochondrial',
  'y_linked',
  'codominant',
] as const;

const VALID_RISK_LEVELS = ['high', 'medium', 'low', 'carrier'] as const;

const VALID_SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'] as const;

const GeneticMarkerImportSchema = z.object({
  markerName: z.string().min(1, '标记名不能为空'),
  geneName: z.string().min(1, '基因名不能为空'),
  chromosome: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      return String(val);
    }),
  position: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? null : num;
    }),
  variant: z.string().min(1, '变异类型不能为空'),
  disease: z.string().min(1, '关联疾病不能为空'),
  species: z
    .string()
    .min(1, '物种不能为空')
    .refine(
      (val) => VALID_SPECIES.includes(val as any) || true,
      (val) => ({
        message: `物种 "${val}" 不在推荐列表中: ${VALID_SPECIES.join(', ')}，但仍可导入`,
      })
    ),
  inheritance: z
    .string()
    .min(1, '遗传模式不能为空')
    .refine(
      (val) => VALID_INHERITANCE.includes(val as any),
      (val) => ({
        message: `遗传模式 "${val}" 无效，有效值: ${VALID_INHERITANCE.join(', ')}`,
      })
    ),
  riskLevel: z
    .string()
    .min(1, '风险等级不能为空')
    .refine(
      (val) => VALID_RISK_LEVELS.includes(val as any),
      (val) => ({
        message: `风险等级 "${val}" 无效，有效值: ${VALID_RISK_LEVELS.join(', ')}`,
      })
    ),
  description: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
});

export type GeneticMarkerImportRow = z.infer<typeof GeneticMarkerImportSchema>;

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface CsvImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: CsvValidationError[];
  importedMarkers: {
    id: string;
    markerName: string;
    geneName: string;
    species: string;
    action: 'created' | 'updated' | 'skipped';
  }[];
}

const CSV_COLUMNS: { key: keyof GeneticMarkerImportRow; header: string; required: boolean }[] = [
  { key: 'markerName', header: '标记名 (markerName)', required: true },
  { key: 'geneName', header: '基因名 (geneName)', required: true },
  { key: 'chromosome', header: '染色体 (chromosome)', required: false },
  { key: 'position', header: '位置 (position)', required: false },
  { key: 'variant', header: '变异类型 (variant)', required: true },
  { key: 'disease', header: '关联疾病 (disease)', required: true },
  { key: 'species', header: '物种 (species)', required: true },
  { key: 'inheritance', header: '遗传模式 (inheritance)', required: true },
  { key: 'riskLevel', header: '风险等级 (riskLevel)', required: true },
  { key: 'description', header: '描述 (description)', required: false },
  { key: 'reference', header: '参考文献 (reference)', required: false },
];

function getColumnKey(header: string): keyof GeneticMarkerImportRow | null {
  const normalizedHeader = header.trim().toLowerCase();
  for (const col of CSV_COLUMNS) {
    const normalizedCol = col.header.toLowerCase();
    if (
      normalizedHeader === normalizedCol ||
      normalizedHeader === col.key.toLowerCase() ||
      normalizedCol.includes(normalizedHeader) ||
      normalizedHeader.includes(col.key.toLowerCase())
    ) {
      return col.key;
    }
  }
  return null;
}

function parseRow(rawRow: Record<string, any>, rowIndex: number): { data: GeneticMarkerImportRow | null; errors: CsvValidationError[] } {
  const normalizedRow: Record<string, any> = {};
  const errors: CsvValidationError[] = [];

  for (const [key, value] of Object.entries(rawRow)) {
    const colKey = getColumnKey(key);
    if (colKey) {
      normalizedRow[colKey] = typeof value === 'string' ? value.trim() : value;
    }
  }

  if (!normalizedRow.markerName && !normalizedRow.geneName) {
    return { data: null, errors: [] };
  }

  const result = GeneticMarkerImportSchema.safeParse(normalizedRow);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex,
        field: issue.path[0] as string,
        message: issue.message,
        value: normalizedRow[issue.path[0] as string] ?? null,
      });
    }
    return { data: null, errors };
  }

  return { data: result.data, errors: [] };
}

export async function parseCsvBuffer(buffer: Buffer): Promise<{
  rows: { data: GeneticMarkerImportRow | null; errors: CsvValidationError[] }[];
  totalRows: number;
}> {
  const workbook = new ExcelJS.Workbook();
  const stream = Readable.from(buffer);
  await workbook.csv.read(stream);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], totalRows: 0 };
  }

  const rows: { data: GeneticMarkerImportRow | null; errors: CsvValidationError[] }[] = [];
  let headerRow: string[] | null = null;

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as any[];

    if (!headerRow) {
      headerRow = values
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).trim());
      return;
    }

    const rowData: Record<string, any> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const header = headerRow[i];
      const cellValue = values[i + 1] !== undefined ? values[i + 1] : null;
      rowData[header] = cellValue;
    }

    const parsed = parseRow(rowData, rowNumber);
    rows.push(parsed);
  });

  return { rows, totalRows: rows.length };
}

export async function validateCsvFile(buffer: Buffer): Promise<Omit<CsvImportResult, 'createdCount' | 'updatedCount' | 'skippedCount' | 'importedMarkers'>> {
  const { rows, totalRows } = await parseCsvBuffer(buffer);

  const errors: CsvValidationError[] = [];
  let validRows = 0;

  for (const row of rows) {
    errors.push(...row.errors);
    if (row.data) {
      validRows++;
    }
  }

  return {
    success: errors.length === 0,
    totalRows,
    validRows,
    invalidRows: totalRows - validRows,
    errors,
  };
}

export async function importGeneticMarkers(
  buffer: Buffer,
  options: { updateExisting?: boolean } = {}
): Promise<CsvImportResult> {
  const { rows, totalRows } = await parseCsvBuffer(buffer);

  const errors: CsvValidationError[] = [];
  const validData: GeneticMarkerImportRow[] = [];
  const importedMarkers: CsvImportResult['importedMarkers'] = [];

  for (const row of rows) {
    errors.push(...row.errors);
    if (row.data) {
      validData.push(row.data);
    }
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const data of validData) {
    const existingMarker = await prisma.geneticMarker.findFirst({
      where: {
        markerName: data.markerName,
        species: data.species,
      },
    });

    if (existingMarker) {
      if (options.updateExisting) {
        const updated = await prisma.geneticMarker.update({
          where: { id: existingMarker.id },
          data: {
            geneName: data.geneName,
            chromosome: data.chromosome ?? null,
            position: data.position ?? null,
            variant: data.variant,
            disease: data.disease,
            inheritance: data.inheritance,
            riskLevel: data.riskLevel,
            description: data.description ?? null,
            reference: data.reference ?? null,
          },
        });
        updatedCount++;
        importedMarkers.push({
          id: updated.id,
          markerName: updated.markerName,
          geneName: updated.geneName,
          species: updated.species,
          action: 'updated',
        });
      } else {
        skippedCount++;
        importedMarkers.push({
          id: existingMarker.id,
          markerName: existingMarker.markerName,
          geneName: existingMarker.geneName,
          species: existingMarker.species,
          action: 'skipped',
        });
      }
    } else {
      const created = await prisma.geneticMarker.create({
        data: {
          markerName: data.markerName,
          geneName: data.geneName,
          chromosome: data.chromosome ?? null,
          position: data.position ?? null,
          variant: data.variant,
          disease: data.disease,
          species: data.species,
          inheritance: data.inheritance,
          riskLevel: data.riskLevel,
          description: data.description ?? null,
          reference: data.reference ?? null,
        },
      });
      createdCount++;
      importedMarkers.push({
        id: created.id,
        markerName: created.markerName,
        geneName: created.geneName,
        species: created.species,
        action: 'created',
      });
    }
  }

  return {
    success: errors.length === 0,
    totalRows,
    validRows: validData.length,
    invalidRows: totalRows - validData.length,
    createdCount,
    updatedCount,
    skippedCount,
    errors,
    importedMarkers,
  };
}

export async function exportGeneticMarkersToCsv(species?: string): Promise<Buffer> {
  const where: any = {};
  if (species && species !== 'all') {
    where.species = species;
  }

  const markers = await prisma.geneticMarker.findMany({
    where,
    orderBy: [{ species: 'asc' }, { markerName: 'asc' }],
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Genetic Markers');

  worksheet.columns = CSV_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.key === 'description' || col.key === 'reference' ? 40 : 20,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  for (const marker of markers) {
    worksheet.addRow({
      markerName: marker.markerName,
      geneName: marker.geneName,
      chromosome: marker.chromosome ?? '',
      position: marker.position ?? '',
      variant: marker.variant,
      disease: marker.disease,
      species: marker.species,
      inheritance: marker.inheritance,
      riskLevel: marker.riskLevel,
      description: marker.description ?? '',
      reference: marker.reference ?? '',
    });
  }

  const buffer = await workbook.csv.writeBuffer();
  return Buffer.from(buffer);
}

export async function getCsvTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Genetic Markers Template');

  worksheet.columns = CSV_COLUMNS.map((col) => ({
    header: col.header + (col.required ? ' [必填]' : ' [可选]'),
    key: col.key,
    width: col.key === 'description' || col.key === 'reference' ? 40 : 25,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  worksheet.addRow({
    markerName: 'MDR1Δ33',
    geneName: 'ABCB1',
    chromosome: '14',
    position: '23000000',
    variant: 'c.227_228delAG',
    disease: '多药耐药性 (MDR1 缺陷)',
    species: 'dog',
    inheritance: 'autosomal_recessive',
    riskLevel: 'high',
    description: 'ABCB1 基因 4 碱基对缺失导致的多药转运蛋白功能缺陷，患病犬对多种药物敏感。',
    reference: 'PMID: 11700465',
  });

  worksheet.addRow({
    markerName: 'PRA-prcd',
    geneName: 'PRCD',
    chromosome: '31',
    position: '11000000',
    variant: 'c.5G>A',
    disease: '进行性视网膜萎缩 (PRA-prcd)',
    species: 'dog',
    inheritance: 'autosomal_recessive',
    riskLevel: 'high',
    description: 'PRCD 基因变异导致的视网膜感光细胞进行性退化，最终失明。',
    reference: '',
  });

  worksheet.addRow({
    markerName: 'PKD1',
    geneName: 'PKD1',
    chromosome: '',
    position: '',
    variant: 'c.10063C>A',
    disease: '多囊肾病 (PKD)',
    species: 'cat',
    inheritance: 'autosomal_dominant',
    riskLevel: 'high',
    description: 'PKD1 基因变异导致的常染色体显性遗传性多囊肾病。',
    reference: '',
  });

  worksheet.getCell('A2').comment = '示例数据 - 请在导入前删除此行及以下示例行';

  const buffer = await workbook.csv.writeBuffer();
  return Buffer.from(buffer);
}

export const CsvConstants = {
  VALID_INHERITANCE,
  VALID_RISK_LEVELS,
  VALID_SPECIES,
  CSV_COLUMNS,
};
