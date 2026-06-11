import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

function parseJsonString(jsonStr: string | null): any {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return jsonStr;
  }
}

function transformAppointment(appointment: any): any {
  return {
    ...appointment,
    testItems: parseJsonString(appointment.testItems),
  };
}

const appointmentSchema = z.object({
  institution: z.string().min(1, '请输入检测机构名称'),
  expectedDate: z.string().min(1, '请选择预计日期'),
  testItems: z.union([z.string(), z.array(z.string())]),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

const appointmentStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'testing', 'completed', 'cancelled']),
});

router.get('/pet/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const { status } = req.query;

    const where: any = { petId };
    if (status && status !== 'all') {
      where.status = status as string;
    }

    const appointments = await prisma.geneTestAppointment.findMany({
      where,
      include: {
        geneReports: true,
      },
      orderBy: [
        { status: 'asc' },
        { expectedDate: 'asc' },
      ],
    });

    res.json(appointments.map(transformAppointment));
  } catch (error) {
    console.error('获取预约列表失败:', error);
    res.status(500).json({ error: '获取预约列表失败' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const { petId } = req.query;

    const where: any = {
      status: { in: ['pending', 'confirmed', 'testing'] },
    };
    if (petId) {
      where.petId = petId as string;
    }

    const appointments = await prisma.geneTestAppointment.findMany({
      where,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            avatarUrl: true,
          },
        },
        geneReports: true,
      },
      orderBy: { expectedDate: 'asc' },
    });

    res.json(appointments.map(transformAppointment));
  } catch (error) {
    console.error('获取进行中预约失败:', error);
    res.status(500).json({ error: '获取进行中预约失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.geneTestAppointment.findUnique({
      where: { id },
      include: {
        pet: true,
        geneReports: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: '预约不存在' });
    }

    res.json(transformAppointment(appointment));
  } catch (error) {
    console.error('获取预约详情失败:', error);
    res.status(500).json({ error: '获取预约详情失败' });
  }
});

router.post('/pet/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const data = appointmentSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const testItemsStr = Array.isArray(data.testItems)
      ? JSON.stringify(data.testItems)
      : data.testItems;

    const appointment = await prisma.geneTestAppointment.create({
      data: {
        petId,
        institution: data.institution,
        expectedDate: new Date(data.expectedDate),
        testItems: testItemsStr,
        notes: data.notes || null,
        status: data.status || 'pending',
      },
      include: {
        geneReports: true,
      },
    });

    res.status(201).json(transformAppointment(appointment));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建预约失败:', error);
    res.status(500).json({ error: '创建预约失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = appointmentSchema.partial().parse(req.body);

    const existing = await prisma.geneTestAppointment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '预约不存在' });
    }

    const updateData: any = {};
    if (data.institution !== undefined) updateData.institution = data.institution;
    if (data.expectedDate !== undefined) updateData.expectedDate = new Date(data.expectedDate);
    if (data.testItems !== undefined) {
      updateData.testItems = Array.isArray(data.testItems)
        ? JSON.stringify(data.testItems)
        : data.testItems;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.geneTestAppointment.update({
      where: { id },
      data: updateData,
      include: {
        geneReports: true,
      },
    });

    res.json(transformAppointment(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新预约失败:', error);
    res.status(500).json({ error: '更新预约失败' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = appointmentStatusSchema.parse(req.body);

    const existing = await prisma.geneTestAppointment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '预约不存在' });
    }

    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.geneTestAppointment.update({
      where: { id },
      data: updateData,
      include: {
        geneReports: true,
      },
    });

    res.json(transformAppointment(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新预约状态失败:', error);
    res.status(500).json({ error: '更新预约状态失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.geneTestAppointment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '预约不存在' });
    }

    await prisma.geneTestAppointment.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除预约失败:', error);
    res.status(500).json({ error: '删除预约失败' });
  }
});

export default router;
