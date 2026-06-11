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

function transformDisease(disease: any): any {
  return {
    ...disease,
    symptoms: parseJsonString(disease.symptoms, 'symptoms') ?? [],
    affectedBreeds: parseJsonString(disease.affectedBreeds, 'affectedBreeds') ?? [],
    references: parseJsonString(disease.references, 'references'),
  };
}

const referenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().min(1),
});

const diseaseSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  inheritance: z.string().min(1),
  symptoms: z.array(z.string()).min(1),
  affectedBreeds: z.array(z.string()).min(1),
  references: z.array(referenceSchema).optional().nullable(),
  description: z.string().optional().nullable(),
  riskLevel: z.string().optional().nullable(),
  prevalence: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  try {
    const { species, inheritance, search } = req.query;

    const where: any = {};

    if (species && species !== 'all') {
      where.species = species as string;
    }
    if (inheritance && inheritance !== 'all') {
      where.inheritance = inheritance as string;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const diseases = await prisma.geneticDisease.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(diseases.map(transformDisease));
  } catch (error) {
    console.error('获取遗传病列表失败:', error);
    res.status(500).json({ error: '获取遗传病列表失败' });
  }
});

router.get('/filter-options', async (req, res) => {
  try {
    const diseases = await prisma.geneticDisease.findMany({
      select: {
        species: true,
        inheritance: true,
      },
      distinct: ['species', 'inheritance'],
    });

    const speciesOptions = [...new Set(diseases.map(d => d.species))];
    const inheritanceOptions = [...new Set(diseases.map(d => d.inheritance))];

    res.json({
      species: speciesOptions,
      inheritance: inheritanceOptions,
    });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ error: '获取筛选选项失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const disease = await prisma.geneticDisease.findUnique({
      where: { id },
    });

    if (!disease) {
      return res.status(404).json({ error: '遗传病不存在' });
    }

    res.json(transformDisease(disease));
  } catch (error) {
    console.error('获取遗传病详情失败:', error);
    res.status(500).json({ error: '获取遗传病详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = diseaseSchema.parse(req.body);

    const disease = await prisma.geneticDisease.create({
      data: {
        ...data,
        symptoms: JSON.stringify(data.symptoms),
        affectedBreeds: JSON.stringify(data.affectedBreeds),
        references: data.references ? JSON.stringify(data.references) : null,
      },
    });

    res.status(201).json(transformDisease(disease));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建遗传病失败:', error);
    res.status(500).json({ error: '创建遗传病失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = diseaseSchema.partial().parse(req.body);

    const existing = await prisma.geneticDisease.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '遗传病不存在' });
    }

    const updateData: any = { ...data };
    if (data.symptoms !== undefined) {
      updateData.symptoms = data.symptoms ? JSON.stringify(data.symptoms) : null;
    }
    if (data.affectedBreeds !== undefined) {
      updateData.affectedBreeds = data.affectedBreeds
        ? JSON.stringify(data.affectedBreeds)
        : null;
    }
    if (data.references !== undefined) {
      updateData.references = data.references ? JSON.stringify(data.references) : null;
    }

    const disease = await prisma.geneticDisease.update({
      where: { id },
      data: updateData,
    });

    res.json(transformDisease(disease));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新遗传病失败:', error);
    res.status(500).json({ error: '更新遗传病失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.geneticDisease.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '遗传病不存在' });
    }

    await prisma.geneticDisease.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除遗传病失败:', error);
    res.status(500).json({ error: '删除遗传病失败' });
  }
});

export default router;
