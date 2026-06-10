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

function transformPetGeneReports(pet: any): any {
  if (pet.geneReports && Array.isArray(pet.geneReports)) {
    return {
      ...pet,
      geneReports: pet.geneReports.map((report: any) => ({
        ...report,
        parsedData: parseJsonString(report.parsedData),
      })),
    };
  }
  return pet;
}

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

const weightRecordSchema = z.object({
  weight: z.number().positive(),
  recordedAt: z.string().optional(),
  note: z.string().optional().nullable(),
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
        { name: { contains: search as string } },
        { breed: { contains: search as string } },
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

    res.json(transformPetGeneReports(pet));
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

router.get('/:id/weights', async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const records = await prisma.weightRecord.findMany({
      where: { petId: id },
      orderBy: { recordedAt: 'desc' },
    });

    res.json(records);
  } catch (error) {
    console.error('获取体重记录失败:', error);
    res.status(500).json({ error: '获取体重记录失败' });
  }
});

router.post('/:id/weights', async (req, res) => {
  try {
    const { id } = req.params;
    const data = weightRecordSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const record = await prisma.weightRecord.create({
      data: {
        petId: id,
        weight: data.weight,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
        note: data.note,
      },
    });

    await prisma.pet.update({
      where: { id },
      data: { weight: data.weight },
    });

    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建体重记录失败:', error);
    res.status(500).json({ error: '创建体重记录失败' });
  }
});

router.put('/:id/weights/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = weightRecordSchema.partial().parse(req.body);

    const record = await prisma.weightRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const updated = await prisma.weightRecord.update({
      where: { id: recordId },
      data: {
        ...data,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : undefined,
      },
    });

    if (data.weight) {
      await prisma.pet.update({
        where: { id: record.petId },
        data: { weight: data.weight },
      });
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新体重记录失败:', error);
    res.status(500).json({ error: '更新体重记录失败' });
  }
});

router.delete('/:id/weights/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.weightRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    await prisma.weightRecord.delete({ where: { id: recordId } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除体重记录失败:', error);
    res.status(500).json({ error: '删除体重记录失败' });
  }
});

router.get('/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const queryPromises: Promise<any>[] = [];

    const needWeight = !type || type === 'weight';
    const needGene = !type || type === 'gene';
    const needBreeding = !type || type === 'breeding';

    if (needWeight) {
      queryPromises.push(
        prisma.weightRecord.findMany({
          where: { petId: id },
          orderBy: { recordedAt: 'asc' },
        })
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    if (needGene) {
      queryPromises.push(
        prisma.geneReport.findMany({
          where: { petId: id },
          orderBy: { uploadedAt: 'desc' },
        })
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    if (needBreeding) {
      queryPromises.push(
        prisma.breedingPair.findMany({
          where: {
            OR: [{ maleId: id }, { femaleId: id }],
          },
          include: {
            male: { select: { id: true, name: true, species: true, breed: true } },
            female: { select: { id: true, name: true, species: true, breed: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      );
    } else {
      queryPromises.push(Promise.resolve([]));
    }

    const [weightRecords, geneReports, breedingPairs] = await Promise.all(queryPromises);

    const allWeights = needWeight
      ? await prisma.weightRecord.findMany({
          where: { petId: id },
          orderBy: { recordedAt: 'asc' },
        })
      : [];

    const timelineEvents: any[] = [];

    for (const record of weightRecords) {
      const idx = allWeights.findIndex((w) => w.id === record.id);
      const prevRecord = idx > 0 ? allWeights[idx - 1] : null;
      const delta = prevRecord ? +(record.weight - prevRecord.weight).toFixed(2) : null;
      const deltaPercent = prevRecord && prevRecord.weight > 0
        ? +((delta! / prevRecord.weight) * 100).toFixed(1)
        : null;

      let trend: 'up' | 'down' | 'stable' | null = null;
      if (delta !== null) {
        if (delta > 0.05) trend = 'up';
        else if (delta < -0.05) trend = 'down';
        else trend = 'stable';
      }

      timelineEvents.push({
        id: `weight-${record.id}`,
        type: 'weight',
        date: record.recordedAt,
        title: '体重记录',
        summary: `体重: ${record.weight} kg`,
        detail: {
          weight: record.weight,
          note: record.note,
          previousWeight: prevRecord?.weight ?? null,
          delta,
          deltaPercent,
          trend,
        },
        link: `/pets/${id}?tab=weight`,
      });
    }

    for (const report of geneReports) {
      const parsedData = parseJsonString(report.parsedData);
      let summary = '基因检测报告';
      let markerSummary = null;

      if (parsedData && parsedData.markers && Array.isArray(parsedData.markers)) {
        const highRisk = parsedData.markers.filter((m: any) => m.riskLevel === 'high').length;
        const carrier = parsedData.markers.filter((m: any) => m.riskLevel === 'carrier').length;
        const mediumRisk = parsedData.markers.filter((m: any) => m.riskLevel === 'medium').length;
        const lowRisk = parsedData.markers.filter((m: any) => m.riskLevel === 'low').length;
        const total = parsedData.markers.length;
        summary = `检测 ${total} 个位点`;
        if (highRisk > 0) summary += `，${highRisk} 个高风险`;
        if (carrier > 0) summary += `，${carrier} 个携带者`;
        markerSummary = { total, highRisk, mediumRisk, carrier, lowRisk };
      }

      timelineEvents.push({
        id: `gene-${report.id}`,
        type: 'gene',
        date: report.uploadedAt,
        title: '基因检测报告',
        summary,
        detail: {
          reportId: report.id,
          fileName: report.fileName,
          reportType: report.reportType,
          status: report.status,
          parsedAt: report.parsedAt,
          markerSummary,
        },
        link: `/gene-reports/${report.id}`,
      });
    }

    for (const pair of breedingPairs) {
      const isMale = pair.maleId === id;
      const partner = isMale ? pair.female : pair.male;
      const riskAssessment = parseRiskAssessment(pair.riskAssessment);
      let summary = `与 ${partner.name} 配种`;
      if (riskAssessment) {
        if (riskAssessment.inbreedingRisk === 'high' || riskAssessment.inbreedingRisk === 'very_high') {
          summary += '，近交风险高';
        } else if (riskAssessment.geneticRisk === 'high') {
          summary += '，遗传风险高';
        }
      }
      timelineEvents.push({
        id: `breeding-${pair.id}`,
        type: 'breeding',
        date: pair.createdAt,
        title: '繁殖记录',
        summary,
        detail: {
          pairId: pair.id,
          partnerId: partner.id,
          partnerName: partner.name,
          partnerSpecies: partner.species,
          partnerBreed: partner.breed,
          pairName: pair.name,
          notes: pair.notes,
          inbreedingCoefficient: pair.inbreedingCoefficient,
          riskAssessment,
        },
        link: `/breeding/${pair.id}`,
      });
    }

    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const weightTrend = allWeights.map((w) => ({
      date: w.recordedAt,
      weight: w.weight,
    }));

    res.json({
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender,
      },
      weightTrend,
      stats: {
        totalWeightRecords: allWeights.length,
        totalGeneReports: geneReports.length,
        totalBreedingRecords: breedingPairs.length,
      },
      events: timelineEvents,
    });
  } catch (error) {
    console.error('获取时间轴数据失败:', error);
    res.status(500).json({ error: '获取时间轴数据失败' });
  }
});

function parseRiskAssessment(riskAssessment: string | null): any {
  if (!riskAssessment) return null;
  try {
    return JSON.parse(riskAssessment);
  } catch {
    return riskAssessment;
  }
}

export default router;
