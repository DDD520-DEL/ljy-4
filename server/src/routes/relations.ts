import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { calculateInbreedingCoefficient, calculatePairInbreeding } from '../utils/inbreeding.js';

const router = Router();

const relationSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1),
  relationType: z.enum(['father', 'mother']),
});

router.post('/', async (req, res) => {
  try {
    const data = relationSchema.parse(req.body);

    if (data.parentId === data.childId) {
      return res.status(400).json({ error: '不能与自己建立亲属关系' });
    }

    const existing = await prisma.parentRelation.findUnique({
      where: {
        parentId_childId_relationType: {
          parentId: data.parentId,
          childId: data.childId,
          relationType: data.relationType,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: '该亲属关系已存在' });
    }

    const parent = await prisma.pet.findUnique({ where: { id: data.parentId } });
    const child = await prisma.pet.findUnique({ where: { id: data.childId } });

    if (!parent || !child) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    if (data.relationType === 'father' && parent.gender === 'female') {
      return res.status(400).json({ error: '父亲应为雄性' });
    }
    if (data.relationType === 'mother' && parent.gender === 'male') {
      return res.status(400).json({ error: '母亲应为雌性' });
    }

    const relation = await prisma.parentRelation.create({ data });

    res.status(201).json(relation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建亲属关系失败:', error);
    res.status(500).json({ error: '创建亲属关系失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.parentRelation.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除亲属关系失败:', error);
    res.status(500).json({ error: '删除亲属关系失败' });
  }
});

router.get('/pet/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const relations = await prisma.parentRelation.findMany({
      where: {
        OR: [
          { parentId: petId },
          { childId: petId },
        ],
      },
      include: {
        parent: true,
        child: true,
      },
    });

    res.json(relations);
  } catch (error) {
    console.error('获取亲属关系失败:', error);
    res.status(500).json({ error: '获取亲属关系失败' });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { relations } = req.body;

    if (!Array.isArray(relations)) {
      return res.status(400).json({ error: 'relations 必须是数组' });
    }

    const results = [];
    for (const rel of relations) {
      try {
        const data = relationSchema.parse(rel);
        const existing = await prisma.parentRelation.findUnique({
          where: {
            parentId_childId_relationType: {
              parentId: data.parentId,
              childId: data.childId,
              relationType: data.relationType,
            },
          },
        });

        if (!existing) {
          const relation = await prisma.parentRelation.create({ data });
          results.push({ success: true, data: relation });
        } else {
          results.push({ success: false, error: '已存在', data: existing });
        }
      } catch (err: any) {
        results.push({ success: false, error: err.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('批量创建亲属关系失败:', error);
    res.status(500).json({ error: '批量创建亲属关系失败' });
  }
});

export default router;
