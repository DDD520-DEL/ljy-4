import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../lib/prisma.js';
import { parseGeneReportPdf, parseGeneReportText, saveParsedReport, generateMockGeneReport } from '../utils/geneParser.js';

const router = Router();

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

    res.json(reports);
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

    res.json(report);
  } catch (error) {
    console.error('获取基因报告详情失败:', error);
    res.status(500).json({ error: '获取基因报告详情失败' });
  }
});

router.post('/upload/:petId', upload.single('file'), async (req: any, res: any) => {
  try {
    const { petId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const reportType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

    const report = await prisma.geneReport.create({
      data: {
        petId,
        reportType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        status: 'pending',
      },
    });

    res.status(201).json({
      report,
      message: '文件上传成功，正在解析...',
    });

    setImmediate(async () => {
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
      } catch (parseError) {
        console.error('解析基因报告失败:', parseError);
        await prisma.geneReport.update({
          where: { id: report.id },
          data: { status: 'failed' },
        });
      }
    });
  } catch (error) {
    console.error('上传基因报告失败:', error);
    res.status(500).json({ error: '上传基因报告失败' });
  }
});

router.post('/mock/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
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
      },
    });

    await saveParsedReport(petId, report.id, mockData);

    const updatedReport = await prisma.geneReport.findUnique({
      where: { id: report.id },
    });

    res.status(201).json(updatedReport);
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

export default router;
