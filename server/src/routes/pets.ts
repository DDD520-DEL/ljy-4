import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

const petSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional().nullable(),
  gender: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  isBreeding: z.boolean().optional(),
  status: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { species, breed, gender, isBreeding, search } = req.query;

    const where: any = {};

    if (species && species !== 'all') {
      where.species = species as string;
    }
    if (breed && breed !== 'all') {
      where.breed = breed as string;
    }
    if (gender && gender !== 'all') {
      where.gender = gender as string;
    }
    if (isBreeding === 'true') {
      where.isBreeding = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { breed: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pets = await prisma.pet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        childRelations: {
          include: { parent: true },
        },
        parentRelations: {
          include: { child: true },
        },
      },
    });

    res.json(pets);
  } catch (error) {
    console.error('获取宠物列表失败:', error);
    res.status(500).json({ error: '获取宠物列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        childRelations: {
          include: { parent: true },
        },
        parentRelations: {
          include: { child: true },
        },
        geneReports: true,
        geneMarkers: {
          include: {
            marker: true,
          },
        },
      },
    });

    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    res.json(pet);
  } catch (error) {
    console.error('获取宠物详情失败:', error);
    res.status(500).json({ error: '获取宠物详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = petSchema.parse(req.body);

    const pet = await prisma.pet.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      },
    });

    res.status(201).json(pet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建宠物失败:', error);
    res.status(500).json({ error: '创建宠物失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = petSchema.partial().parse(req.body);

    const pet = await prisma.pet.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    res.json(pet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新宠物失败:', error);
    res.status(500).json({ error: '更新宠物失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.pet.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除宠物失败:', error);
    res.status(500).json({ error: '删除宠物失败' });
  }
});

router.get('/:id/pedigree', async (req, res) => {
  try {
    const { id } = req.params;
    const { generations = '5' } = req.query;
    const maxGen = parseInt(generations as string);

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const pedigree = await buildPedigreeTree(id, maxGen);
    res.json(pedigree);
  } catch (error) {
    console.error('获取谱系树失败:', error);
    res.status(500).json({ error: '获取谱系树失败' });
  }
});

async function buildPedigreeTree(petId: string, maxGenerations: number) {
  const visited = new Set<string>();

  async function buildTree(id: string, generation: number): Promise<any> {
    if (generation > maxGenerations || visited.has(id)) {
      return null;
    }
    visited.add(id);

    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        childRelations: {
          include: { parent: true },
        },
      },
    });

    if (!pet) return null;

    const fatherRelation = pet.childRelations.find((r) => r.relationType === 'father');
    const motherRelation = pet.childRelations.find((r) => r.relationType === 'mother');

    const father = fatherRelation ? await buildTree(fatherRelation.parentId, generation + 1) : null;
    const mother = motherRelation ? await buildTree(motherRelation.parentId, generation + 1) : null;

    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
      generation,
      isBreeding: pet.isBreeding,
      avatarUrl: pet.avatarUrl,
      father,
      mother,
    };
  }

  return buildTree(petId, 0);
}

export default router;
