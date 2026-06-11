import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createRequire } from 'module';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma.js';
import { parseGeneReportPdf, parseGeneReportText, saveParsedReport, generateMockGeneReport } from '../utils/geneParser.js';
import { getPetGeneticMarkers, calculateIndividualRisk } from '../utils/geneticRisk.js';
import { checkPetAlerts } from '../utils/breedingAlerts.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const router = Router();

export const APPOINTMENT_LINKABLE_STATUSES = ['pending', 'confirmed', 'testing'] as const;
export type AppointmentLinkableStatus = typeof APPOINTMENT_LINKABLE_STATUSES[number];

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  testing: '检测中',
  completed: '已完成',
  cancelled: '已取消',
};

function parseParsedData(parsedData: string | null): any {
  if (!parsedData) return null;
  try {
    return JSON.parse(parsedData);
  } catch {
    return parsedData;
  }
}

export async function validateAppointmentForLink(appointmentId: string, petId: string) {
  const appointment = await prisma.geneTestAppointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    return { valid: false as const, error: '预约记录不存在' };
  }
  if (appointment.petId !== petId) {
    return { valid: false as const, error: '预约记录与宠物不匹配' };
  }
  if (!APPOINTMENT_LINKABLE_STATUSES.includes(appointment.status as AppointmentLinkableStatus)) {
    const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status;
    return {
      valid: false as const,
      error: `预约当前状态为「${statusLabel}」，不允许关联上传报告`,
    };
  }
  return { valid: true as const, appointment };
}

export async function rollbackAppointmentStatusIfNeeded(appointmentId: string | null | undefined) {
  if (!appointmentId) return;
  try {
    const apt = await prisma.geneTestAppointment.findUnique({
      where: { id: appointmentId },
      select: { status: true },
    });
    if (apt && apt.status === 'testing') {
      await prisma.geneTestAppointment.update({
        where: { id: appointmentId },
        data: { status: 'confirmed' },
      });
      console.log(`[Appointment Rollback] 预约 ${appointmentId} 状态已从 testing 回滚至 confirmed`);
    }
  } catch (rollbackErr) {
    console.error(`[Appointment Rollback] 预约 ${appointmentId} 回滚失败:`, rollbackErr);
  }
}

const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|txt|csv|jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式') as any);
    }
  },
});

router.get('/pet/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const reports = await prisma.geneReport.findMany({
      where: { petId },
      orderBy: { uploadedAt: 'desc' },
    });

    const parsedReports = reports.map((report) => ({
      ...report,
      parsedData: parseParsedData(report.parsedData),
    }));

    res.json(parsedReports);
  } catch (error) {
    console.error('获取基因报告列表失败:', error);
    res.status(500).json({ error: '获取基因报告列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.geneReport.findUnique({
      where: { id },
      include: { pet: true },
    });

    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }

    res.json({
      ...report,
      parsedData: parseParsedData(report.parsedData),
    });
  } catch (error) {
    console.error('获取基因报告详情失败:', error);
    res.status(500).json({ error: '获取基因报告详情失败' });
  }
});

router.post('/upload/:petId', upload.single('file'), async (req: any, res: any) => {
  const reportContext: { reportId?: string; appointmentId?: string } = {};
  try {
    const { petId } = req.params;
    const { appointmentId } = req.body;
    reportContext.appointmentId = appointmentId;

    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    if (appointmentId) {
      const validation = await validateAppointmentForLink(appointmentId, petId);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const reportType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

    const report = await prisma.geneReport.create({
      data: {
        petId,
        reportType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        status: 'pending',
        appointmentId: appointmentId || null,
      },
    });
    reportContext.reportId = report.id;

    if (appointmentId) {
      await prisma.geneTestAppointment.update({
        where: { id: appointmentId },
        data: { status: 'testing' },
      });
    }

    res.status(201).json({
      report: {
        ...report,
        parsedData: parseParsedData(report.parsedData),
      },
      message: '文件上传成功，正在解析...',
    });

    setImmediate(async () => {
      let parseSuccess = false;
      try {
        const filePath = path.join(uploadDir, req.file.filename);
        let parsedData;

        if (reportType === 'pdf') {
          parsedData = await parseGeneReportPdf(filePath);
        } else {
          parsedData = generateMockGeneReport(pet.species, pet.breed || '');
        }

        if (parsedData.markers.length === 0) {
          parsedData = generateMockGeneReport(pet.species, pet.breed || '');
        }

        await saveParsedReport(petId, report.id, parsedData);
        parseSuccess = true;

        if (appointmentId) {
          await prisma.geneTestAppointment.update({
            where: { id: appointmentId },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          });
        }

        await checkPetAlerts(petId);
      } catch (parseError) {
        console.error('解析基因报告失败:', parseError);
        await prisma.geneReport.update({
          where: { id: report.id },
          data: { status: 'failed' },
        });
        if (appointmentId) {
          await rollbackAppointmentStatusIfNeeded(appointmentId);
        }
      }
    });
  } catch (error) {
    console.error('上传基因报告失败:', error);
    if (reportContext.reportId) {
      await prisma.geneReport.update({
        where: { id: reportContext.reportId },
        data: { status: 'failed' },
      }).catch(() => {});
    }
    await rollbackAppointmentStatusIfNeeded(reportContext.appointmentId);
    res.status(500).json({ error: '上传基因报告失败' });
  }
});

router.post('/mock/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const { appointmentId } = req.body;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    if (appointmentId) {
      const validation = await validateAppointmentForLink(appointmentId, petId);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const mockData = generateMockGeneReport(pet.species, pet.breed || '');

    const report = await prisma.geneReport.create({
      data: {
        petId,
        reportType: 'mock',
        fileName: `mock-report-${Date.now()}.json`,
        status: 'parsed',
        parsedData: JSON.stringify(mockData),
        parsedAt: new Date(),
        appointmentId: appointmentId || null,
      },
    });

    await saveParsedReport(petId, report.id, mockData);

    if (appointmentId) {
      await prisma.geneTestAppointment.update({
        where: { id: appointmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    await checkPetAlerts(petId);

    const updatedReport = await prisma.geneReport.findUnique({
      where: { id: report.id },
    });

    if (updatedReport) {
      res.status(201).json({
        ...updatedReport,
        parsedData: parseParsedData(updatedReport.parsedData),
      });
    } else {
      res.status(201).json({
        ...report,
        parsedData: mockData,
      });
    }
  } catch (error) {
    console.error('生成模拟基因报告失败:', error);
    res.status(500).json({ error: '生成模拟基因报告失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.geneReport.findUnique({ where: { id } });
    if (report?.fileUrl) {
      const filePath = path.join(process.cwd(), report.fileUrl);
      fs.unlink(filePath).catch(() => {});
    }

    await prisma.geneReport.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除基因报告失败:', error);
    res.status(500).json({ error: '删除基因报告失败' });
  }
});

router.post('/batch-export', async (req, res) => {
  try {
    const { reportIds } = req.body as { reportIds: string[] };

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: '请选择至少一份报告' });
    }

    const reports = await prisma.geneReport.findMany({
      where: { id: { in: reportIds } },
      include: { pet: true },
    });

    if (reports.length === 0) {
      return res.status(404).json({ error: '未找到指定报告' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=gene-reports-export-${Date.now()}.zip`
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('ZIP打包失败:', err);
      res.status(500).json({ error: '打包失败' });
    });

    const petRiskMap = new Map<string, any[]>();

    for (const report of reports) {
      const petName = report.pet.name;
      const safePetName = petName.replace(/[<>:"/\\|?*]/g, '_');
      const reportDir = `${safePetName}_${report.id.slice(0, 8)}`;

      if (report.fileUrl) {
        const filePath = path.join(process.cwd(), report.fileUrl);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: `${reportDir}/${report.fileName}` });
        } catch {
          // original file may not exist
        }
      }

      if (report.parsedData) {
        const parsedData = parseParsedData(report.parsedData);
        archive.append(JSON.stringify(parsedData, null, 2), {
          name: `${reportDir}/parsed_result.json`,
        });
      }

      try {
        const markers = await getPetGeneticMarkers(report.petId);
        const riskResults = markers.map((marker) => {
          const risk = calculateIndividualRisk(marker);
          return {
            petName: report.pet.name,
            petBreed: report.pet.breed || '',
            petSpecies: report.pet.species,
            markerName: marker.markerName,
            geneName: marker.geneName,
            disease: marker.disease,
            inheritance: marker.inheritance,
            genotype: marker.genotype || '未检测',
            zygosity: marker.zygosity || '',
            riskScore: risk.riskScore,
            riskLevel: risk.riskLevel,
            explanation: risk.explanation,
          };
        });
        petRiskMap.set(report.petId, riskResults);
      } catch {
        // skip risk calculation on error
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('基因检测汇总');

    sheet.columns = [
      { header: '宠物名称', key: 'petName', width: 14 },
      { header: '品种', key: 'petBreed', width: 14 },
      { header: '物种', key: 'petSpecies', width: 8 },
      { header: '检测位点', key: 'markerName', width: 14 },
      { header: '基因名', key: 'geneName', width: 12 },
      { header: '相关疾病', key: 'disease', width: 20 },
      { header: '遗传模式', key: 'inheritance', width: 18 },
      { header: '基因型', key: 'genotype', width: 10 },
      { header: '合子状态', key: 'zygosity', width: 14 },
      { header: '风险分数', key: 'riskScore', width: 10 },
      { header: '风险等级', key: 'riskLevel', width: 10 },
      { header: '风险说明', key: 'explanation', width: 50 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    for (const [, riskResults] of petRiskMap) {
      for (const row of riskResults) {
        const addedRow = sheet.addRow(row);

        const riskLevel = row.riskLevel;
        let fillColor: string;
        switch (riskLevel) {
          case 'high':
            fillColor = 'FFFEE2E2';
            break;
          case 'medium':
            fillColor = 'FFFFF7ED';
            break;
          case 'carrier':
            fillColor = 'FFFEF9C3';
            break;
          case 'low':
            fillColor = 'FFF0FDF4';
            break;
          default:
            fillColor = 'FFF1F5F9';
        }

        addedRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor },
          };
        });

        const riskCell = addedRow.getCell('riskLevel');
        riskCell.font = { bold: true };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    archive.append(buffer as Buffer, { name: '基因检测汇总表.xlsx' });

    await archive.finalize();
  } catch (error) {
    console.error('批量导出失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: '批量导出失败' });
    }
  }
});

export default router;
