import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

const reminderSchema = z.object({
  petId: z.string().min(1),
  title: z.string().min(1, '提醒标题不能为空'),
  remindAt: z.string().min(1, '提醒日期不能为空'),
  notes: z.string().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { petId, isCompleted, today, includeCompleted } = req.query;

    const where: any = {};

    if (petId) {
      where.petId = petId as string;
    }

    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted === 'true';
    }

    if (today === 'true') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
      where.remindAt = {
        lte: endOfDay,
      };
      if (includeCompleted !== 'true') {
        where.isCompleted = false;
      }
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
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
      },
    });

    res.json(reminders);
  } catch (error) {
    console.error('获取提醒列表失败:', error);
    res.status(500).json({ error: '获取提醒列表失败' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const reminders = await prisma.reminder.findMany({
      where: {
        remindAt: {
          lte: endOfDay,
        },
        isCompleted: false,
      },
      orderBy: { remindAt: 'asc' },
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
      },
    });

    const upcoming = await prisma.reminder.findMany({
      where: {
        remindAt: {
          gt: endOfDay,
          lte: new Date(endOfDay.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        isCompleted: false,
      },
      orderBy: { remindAt: 'asc' },
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
      },
      take: 5,
    });

    res.json({
      today: reminders,
      upcoming,
      stats: {
        todayCount: reminders.length,
        upcomingCount: upcoming.length,
        overdueCount: reminders.filter((r) => new Date(r.remindAt) < startOfDay).length,
      },
    });
  } catch (error) {
    console.error('获取今日提醒失败:', error);
    res.status(500).json({ error: '获取今日提醒失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await prisma.reminder.findUnique({
      where: { id },
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
      },
    });

    if (!reminder) {
      return res.status(404).json({ error: '提醒不存在' });
    }

    res.json(reminder);
  } catch (error) {
    console.error('获取提醒详情失败:', error);
    res.status(500).json({ error: '获取提醒详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = reminderSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({ where: { id: data.petId } });
    if (!pet) {
      return res.status(404).json({ error: '关联的宠物不存在' });
    }

    const reminder = await prisma.reminder.create({
      data: {
        petId: data.petId,
        title: data.title,
        remindAt: new Date(data.remindAt),
        notes: data.notes || null,
        isCompleted: data.isCompleted || false,
      },
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
      },
    });

    res.status(201).json(reminder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建提醒失败:', error);
    res.status(500).json({ error: '创建提醒失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = reminderSchema.partial().parse(req.body);

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      return res.status(404).json({ error: '提醒不存在' });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.remindAt !== undefined) updateData.remindAt = new Date(data.remindAt);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;

    const updated = await prisma.reminder.update({
      where: { id },
      data: updateData,
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
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新提醒失败:', error);
    res.status(500).json({ error: '更新提醒失败' });
  }
});

router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      return res.status(404).json({ error: '提醒不存在' });
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: { isCompleted: !reminder.isCompleted },
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
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('切换提醒完成状态失败:', error);
    res.status(500).json({ error: '切换提醒完成状态失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      return res.status(404).json({ error: '提醒不存在' });
    }

    await prisma.reminder.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除提醒失败:', error);
    res.status(500).json({ error: '删除提醒失败' });
  }
});

export default router;
