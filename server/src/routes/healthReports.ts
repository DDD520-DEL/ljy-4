import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'health-reports');
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|gif|bmp|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，仅支持 PDF 和图片文件') as any);
    }
  },
});

const healthReportSchema = z.object({
  examDate: z.string().min(1, '请选择体检日期'),
  hospitalName: z.string().min(1, '请输入医院名称'),
  conclusion: z.string().optional().nullable(),
});

router.get('/pet/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const reports = await prisma.healthReport.findMany({
      where: { petId },
      orderBy: { examDate: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    console.error('获取体检报告列表失败:', error);
    res.status(500).json({ error: '获取体检报告列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.healthReport.findUnique({
      where: { id },
      include: { pet: true },
    });

    if (!report) {
      return res.status(404).json({ error: '体检报告不存在' });
    }

    res.json(report);
  } catch (error) {
    console.error('获取体检报告详情失败:', error);
    res.status(500).json({ error: '获取体检报告详情失败' });
  }
});

router.post('/upload/:petId', upload.single('file'), async (req: any, res: any) => {
  try {
    const { petId } = req.params;
    const { examDate, hospitalName, conclusion } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '请上传体检报告文件' });
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      await fs.unlink(path.join(uploadDir, req.file.filename)).catch(() => {});
      return res.status(404).json({ error: '宠物不存在' });
    }

    const validated = healthReportSchema.safeParse({ examDate, hospitalName, conclusion });
    if (!validated.success) {
      await fs.unlink(path.join(uploadDir, req.file.filename)).catch(() => {});
      return res.status(400).json({ error: '数据验证失败', details: validated.error.errors });
    }

    const mimeType = req.file.mimetype;
    const reportType = mimeType.includes('pdf') ? 'pdf' : 'image';

    const report = await prisma.healthReport.create({
      data: {
        petId,
        reportType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/health-reports/${req.file.filename}`,
        examDate: new Date(validated.data.examDate),
        hospitalName: validated.data.hospitalName,
        conclusion: validated.data.conclusion || null,
      },
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('上传体检报告失败:', error);
    if (req.file) {
      await fs.unlink(path.join(uploadDir, req.file.filename)).catch(() => {});
    }
    res.status(500).json({ error: '上传体检报告失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = healthReportSchema.partial().parse(req.body);

    const report = await prisma.healthReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: '体检报告不存在' });
    }

    const updated = await prisma.healthReport.update({
      where: { id },
      data: {
        ...data,
        examDate: data.examDate ? new Date(data.examDate) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新体检报告失败:', error);
    res.status(500).json({ error: '更新体检报告失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.healthReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: '体检报告不存在' });
    }

    if (report.fileUrl) {
      const filePath = path.join(process.cwd(), report.fileUrl);
      fs.unlink(filePath).catch(() => {});
    }

    await prisma.healthReport.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除体检报告失败:', error);
    res.status(500).json({ error: '删除体检报告失败' });
  }
});

export default router;
