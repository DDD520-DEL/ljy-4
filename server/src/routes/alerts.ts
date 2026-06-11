import { Router } from 'express';
import prisma from '../lib/prisma.js';
import {
  runFullAlertScan,
  checkPetAlerts,
  parseDetails,
} from '../utils/breedingAlerts.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { isRead, petId, alertType, limit, offset } = req.query;

    const where: any = {};

    if (isRead !== undefined) {
      where.isRead = isRead === 'true' || isRead === true;
    }
    if (petId) {
      where.petId = petId as string;
    }
    if (alertType) {
      where.alertType = alertType as string;
    }

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = offset ? parseInt(offset as string) : undefined;

    const [alerts, totalCount] = await Promise.all([
      prisma.breedingAlert.findMany({
        where,
        orderBy: [
          { isRead: 'asc' },
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              gender: true,
              avatarUrl: true,
            },
          },
        },
        take,
        skip,
      }),
      prisma.breedingAlert.count({ where }),
    ]);

    const parsedAlerts = alerts.map((alert) => ({
      ...alert,
      details: parseDetails(alert.details),
    }));

    res.json({
      alerts: parsedAlerts,
      total: totalCount,
    });
  } catch (error) {
    console.error('获取警告列表失败:', error);
    res.status(500).json({ error: '获取警告列表失败' });
  }
});

router.get('/unread', async (req, res) => {
  try {
    const { petId } = req.query;

    const where: any = { isRead: false };
    if (petId) {
      where.petId = petId as string;
    }

    const [alerts, totalCount, dangerCount, warningCount] = await Promise.all([
      prisma.breedingAlert.findMany({
        where,
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              gender: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.breedingAlert.count({ where }),
      prisma.breedingAlert.count({ where: { ...where, severity: 'danger' } }),
      prisma.breedingAlert.count({ where: { ...where, severity: 'warning' } }),
    ]);

    const parsedAlerts = alerts.map((alert) => ({
      ...alert,
      details: parseDetails(alert.details),
    }));

    const affectedPetIds = new Set<string>();
    alerts.forEach((alert) => {
      if (alert.petId) {
        affectedPetIds.add(alert.petId);
      }
    });

    res.json({
      alerts: parsedAlerts,
      stats: {
        total: totalCount,
        danger: dangerCount,
        warning: warningCount,
        affectedPets: affectedPetIds.size,
      },
      affectedPetIds: Array.from(affectedPetIds),
    });
  } catch (error) {
    console.error('获取未读警告失败:', error);
    res.status(500).json({ error: '获取未读警告失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.breedingAlert.findUnique({
      where: { id },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            gender: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({ error: '警告不存在' });
    }

    res.json({
      ...alert,
      details: parseDetails(alert.details),
    });
  } catch (error) {
    console.error('获取警告详情失败:', error);
    res.status(500).json({ error: '获取警告详情失败' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.breedingAlert.findUnique({ where: { id } });
    if (!alert) {
      return res.status(404).json({ error: '警告不存在' });
    }

    const updated = await prisma.breedingAlert.update({
      where: { id },
      data: { isRead: true },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      ...updated,
      details: parseDetails(updated.details),
    });
  } catch (error) {
    console.error('标记警告已读失败:', error);
    res.status(500).json({ error: '标记警告已读失败' });
  }
});

router.put('/read/batch', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要标记的警告ID列表' });
    }

    const result = await prisma.breedingAlert.updateMany({
      where: {
        id: { in: ids },
      },
      data: { isRead: true },
    });

    res.json({
      message: '批量标记已读成功',
      markedCount: result.count,
    });
  } catch (error) {
    console.error('批量标记已读失败:', error);
    res.status(500).json({ error: '批量标记已读失败' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const result = await prisma.breedingAlert.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    res.json({
      message: '全部标记已读成功',
      markedCount: result.count,
    });
  } catch (error) {
    console.error('全部标记已读失败:', error);
    res.status(500).json({ error: '全部标记已读失败' });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const result = await runFullAlertScan();

    res.json({
      message: '警告扫描完成',
      ...result,
    });
  } catch (error) {
    console.error('执行警告扫描失败:', error);
    res.status(500).json({ error: '执行警告扫描失败' });
  }
});

router.post('/scan-pet/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const result = await checkPetAlerts(petId);

    res.json({
      message: '宠物警告扫描完成',
      petId,
      petName: pet.name,
      ...result,
    });
  } catch (error) {
    console.error('扫描宠物警告失败:', error);
    res.status(500).json({ error: '扫描宠物警告失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.breedingAlert.findUnique({ where: { id } });
    if (!alert) {
      return res.status(404).json({ error: '警告不存在' });
    }

    await prisma.breedingAlert.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除警告失败:', error);
    res.status(500).json({ error: '删除警告失败' });
  }
});

router.delete('/clear/read', async (req, res) => {
  try {
    const result = await prisma.breedingAlert.deleteMany({
      where: { isRead: true },
    });

    res.json({
      message: '已清除已读警告',
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('清除已读警告失败:', error);
    res.status(500).json({ error: '清除已读警告失败' });
  }
});

export default router;
