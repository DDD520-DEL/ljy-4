import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

function parseJsonString(jsonStr: string | null, fieldName = 'unknown'): any {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error(`[parseJsonString] 解析 JSON 失败 (字段: ${fieldName}):`, error, '原始值:', jsonStr);
    return null;
  }
}

function transformBreed(breed: any): any {
  return {
    ...breed,
    commonDiseases: parseJsonString(breed.commonDiseases, 'commonDiseases') ?? [],
    carePoints: parseJsonString(breed.carePoints, 'carePoints') ?? [],
  };
}

const breedSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  origin: z.string().optional().nullable(),
  avgLifespan: z.string().optional().nullable(),
  commonDiseases: z.array(z.string()).optional().nullable(),
  carePoints: z.array(z.string()).optional().nullable(),
  description: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  sizeCategory: z.string().optional().nullable(),
  temperament: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  try {
    const { species, search } = req.query;

    const where: any = {};

    if (species && species !== 'all') {
      where.species = species as string;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { origin: { contains: search as string } },
      ];
    }

    const breeds = await prisma.breed.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(breeds.map(transformBreed));
  } catch (error) {
    console.error('获取品种列表失败:', error);
    res.status(500).json({ error: '获取品种列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const breed = await prisma.breed.findUnique({
      where: { id },
    });

    if (!breed) {
      return res.status(404).json({ error: '品种不存在' });
    }

    res.json(transformBreed(breed));
  } catch (error) {
    console.error('获取品种详情失败:', error);
    res.status(500).json({ error: '获取品种详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = breedSchema.parse(req.body);

    const breed = await prisma.breed.create({
      data: {
        ...data,
        commonDiseases: data.commonDiseases
          ? JSON.stringify(data.commonDiseases)
          : null,
        carePoints: data.carePoints ? JSON.stringify(data.carePoints) : null,
      },
    });

    res.status(201).json(transformBreed(breed));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建品种失败:', error);
    res.status(500).json({ error: '创建品种失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = breedSchema.partial().parse(req.body);

    const updateData: any = { ...data };
    if (data.commonDiseases !== undefined) {
      updateData.commonDiseases = data.commonDiseases
        ? JSON.stringify(data.commonDiseases)
        : null;
    }
    if (data.carePoints !== undefined) {
      updateData.carePoints = data.carePoints
        ? JSON.stringify(data.carePoints)
        : null;
    }

    const breed = await prisma.breed.update({
      where: { id },
      data: updateData,
    });

    res.json(transformBreed(breed));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新品种失败:', error);
    res.status(500).json({ error: '更新品种失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.breed.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除品种失败:', error);
    res.status(500).json({ error: '删除品种失败' });
  }
});

export default router;
