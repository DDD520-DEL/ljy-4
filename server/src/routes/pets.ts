import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { calculateInbreedingCoefficient } from '../utils/inbreeding.js';

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

const petTransferSchema = z.object({
  fromOwnerName: z.string().min(1),
  fromOwnerContact: z.string().optional().nullable(),
  toOwnerName: z.string().min(1),
  toOwnerContact: z.string().optional().nullable(),
  transferDate: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const vaccineRecordSchema = z.object({
  vaccineName: z.string().min(1),
  vaccinationDate: z.string().min(1),
  expiryDate: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const dailyLogSchema = z.object({
  content: z.string().min(1, '日志内容不能为空'),
  imageUrl: z.string().optional().nullable(),
  mood: z.enum(['happy', 'normal', 'unwell']),
});

router.get('/compare', async (req, res) => {
  try {
    const { pet1Id, pet2Id } = req.query;

    if (!pet1Id || !pet2Id) {
      return res.status(400).json({ error: '请提供 pet1Id 和 pet2Id 参数' });
    }

    const [pet1, pet2] = await Promise.all([
      prisma.pet.findUnique({
        where: { id: pet1Id as string },
        include: {
          geneMarkers: {
            include: { marker: true },
            orderBy: { marker: { disease: 'asc' } },
          },
          childRelations: { include: { parent: true } },
        },
      }),
      prisma.pet.findUnique({
        where: { id: pet2Id as string },
        include: {
          geneMarkers: {
            include: { marker: true },
            orderBy: { marker: { disease: 'asc' } },
          },
          childRelations: { include: { parent: true } },
        },
      }),
    ]);

    if (!pet1) {
      return res.status(404).json({ error: `宠物 ${pet1Id} 不存在` });
    }
    if (!pet2) {
      return res.status(404).json({ error: `宠物 ${pet2Id} 不存在` });
    }

    const [inbreeding1, inbreeding2] = await Promise.all([
      calculateInbreedingCoefficient(pet1Id as string),
      calculateInbreedingCoefficient(pet2Id as string),
    ]);

    function formatPet(pet: any, inbreedingCoeff: number) {
      const markers = pet.geneMarkers.map((gm: any) => ({
        id: gm.id,
        markerId: gm.markerId,
        markerName: gm.marker?.markerName ?? '',
        geneName: gm.marker?.geneName ?? '',
        disease: gm.marker?.disease ?? '',
        inheritance: gm.marker?.inheritance ?? '',
        riskLevel: gm.marker?.riskLevel ?? '',
        genotype: gm.genotype,
        allele1: gm.allele1,
        allele2: gm.allele2,
        zygosity: gm.zygosity,
        source: gm.source,
        testedAt: gm.testedAt,
      }));

      return {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender,
        birthDate: pet.birthDate,
        color: pet.color,
        weight: pet.weight,
        description: pet.description,
        avatarUrl: pet.avatarUrl,
        isBreeding: pet.isBreeding,
        status: pet.status,
        geneMarkers: markers,
        inbreedingCoefficient: inbreedingCoeff,
        inbreedingRiskLevel: getInbreedingRiskLevel(inbreedingCoeff),
        inbreedingInterpretation: getInbreedingInterpretation(inbreedingCoeff),
        parentNames: {
          father: pet.childRelations?.find((r: any) => r.relationType === 'father')?.parent?.name ?? null,
          mother: pet.childRelations?.find((r: any) => r.relationType === 'mother')?.parent?.name ?? null,
        },
      };
    }

    function getInbreedingRiskLevel(coeff: number): string {
      if (coeff > 0.25) return 'very_high';
      if (coeff > 0.125) return 'high';
      if (coeff > 0.0625) return 'medium';
      return 'low';
    }

    function getInbreedingInterpretation(coeff: number): string {
      if (coeff === 0) return '无亲缘关系';
      if (coeff <= 0.03125) return '远亲关系，风险较低';
      if (coeff <= 0.0625) return '表亲级关系，需谨慎';
      if (coeff <= 0.125) return '半同胞/叔侄级，风险中等';
      if (coeff <= 0.25) return '全同胞/亲子级，风险高';
      return '极高风险，严禁繁殖';
    }

    res.json({
      pet1: formatPet(pet1, inbreeding1),
      pet2: formatPet(pet2, inbreeding2),
    });
  } catch (error) {
    console.error('宠物对比失败:', error);
    res.status(500).json({ error: '宠物对比失败' });
  }
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

const BREED_WEIGHT_STANDARDS: Record<string, Record<string, { min: number; max: number; unit: string }>> = {
  dog: {
    '金毛寻回犬': { min: 25, max: 36, unit: 'kg' },
    '拉布拉多': { min: 25, max: 36, unit: 'kg' },
    '德国牧羊犬': { min: 22, max: 40, unit: 'kg' },
    '边境牧羊犬': { min: 12, max: 20, unit: 'kg' },
    '柯基': { min: 10, max: 14, unit: 'kg' },
    '柴犬': { min: 8, max: 11, unit: 'kg' },
    '比熊': { min: 3, max: 5, unit: 'kg' },
    '贵宾犬(标准)': { min: 20, max: 32, unit: 'kg' },
    '贵宾犬(迷你)': { min: 6, max: 9, unit: 'kg' },
    '贵宾犬(玩具)': { min: 2, max: 4, unit: 'kg' },
    '萨摩耶': { min: 16, max: 30, unit: 'kg' },
    '哈士奇': { min: 16, max: 27, unit: 'kg' },
    '阿拉斯加': { min: 32, max: 45, unit: 'kg' },
    '斗牛犬': { min: 18, max: 25, unit: 'kg' },
    '法斗': { min: 8, max: 14, unit: 'kg' },
    '吉娃娃': { min: 1.5, max: 3, unit: 'kg' },
    '博美': { min: 1.8, max: 3.5, unit: 'kg' },
    '约克夏': { min: 2, max: 3.5, unit: 'kg' },
    '雪纳瑞(迷你)': { min: 5, max: 8, unit: 'kg' },
    '雪纳瑞(标准)': { min: 14, max: 20, unit: 'kg' },
    '松狮': { min: 20, max: 32, unit: 'kg' },
    '中华田园犬': { min: 10, max: 25, unit: 'kg' },
  },
  cat: {
    '英短': { min: 4, max: 8, unit: 'kg' },
    '美短': { min: 3.5, max: 7, unit: 'kg' },
    '布偶猫': { min: 4.5, max: 9, unit: 'kg' },
    '波斯猫': { min: 3, max: 7, unit: 'kg' },
    '暹罗猫': { min: 2.5, max: 6, unit: 'kg' },
    '缅因猫': { min: 5, max: 11, unit: 'kg' },
    '苏格兰折耳': { min: 3, max: 6, unit: 'kg' },
    '俄罗斯蓝猫': { min: 3, max: 7, unit: 'kg' },
    '孟加拉豹猫': { min: 4, max: 7, unit: 'kg' },
    '狸花猫': { min: 3, max: 6, unit: 'kg' },
    '橘猫': { min: 3.5, max: 7, unit: 'kg' },
    '加菲猫': { min: 3, max: 6.5, unit: 'kg' },
    '斯芬克斯': { min: 3, max: 6, unit: 'kg' },
    '中华田园猫': { min: 3, max: 6, unit: 'kg' },
  },
};

router.get('/breeds/weight-standard', async (req, res) => {
  try {
    const { species, breed } = req.query;

    if (!species || !breed) {
      return res.status(400).json({ error: '请提供 species 和 breed 参数' });
    }

    const speciesStandards = BREED_WEIGHT_STANDARDS[species as string];
    if (!speciesStandards) {
      return res.json({ standard: null, message: '该物种暂无标准体重数据' });
    }

    const breedName = breed as string;
    let standard = speciesStandards[breedName];

    if (!standard) {
      const matchedKey = Object.keys(speciesStandards).find(
        (key) => breedName.includes(key) || key.includes(breedName)
      );
      if (matchedKey) {
        standard = speciesStandards[matchedKey];
      }
    }

    if (!standard) {
      const allWeights = Object.values(speciesStandards);
      const avgMin = +(allWeights.reduce((s, w) => s + w.min, 0) / allWeights.length).toFixed(1);
      const avgMax = +(allWeights.reduce((s, w) => s + w.max, 0) / allWeights.length).toFixed(1);
      return res.json({
        standard: { min: avgMin, max: avgMax, unit: 'kg' },
        isEstimated: true,
        message: '未找到该品种的精确数据，已提供同物种参考范围',
      });
    }

    res.json({ standard, isEstimated: false, message: '已找到该品种标准体重范围' });
  } catch (error) {
    console.error('获取品种标准体重失败:', error);
    res.status(500).json({ error: '获取品种标准体重失败' });
  }
});

router.get('/:id/transfers', async (req, res) => {
  try {
    const { id } = req.params;
    const { owner } = req.query;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const where: any = { petId: id };
    if (owner) {
      where.OR = [
        { fromOwnerName: { contains: owner as string } },
        { toOwnerName: { contains: owner as string } },
      ];
    }

    const records = await prisma.petTransfer.findMany({
      where,
      orderBy: { transferDate: 'desc' },
    });

    res.json(records);
  } catch (error) {
    console.error('获取流转记录失败:', error);
    res.status(500).json({ error: '获取流转记录失败' });
  }
});

router.post('/:id/transfers', async (req, res) => {
  try {
    const { id } = req.params;
    const data = petTransferSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const record = await prisma.petTransfer.create({
      data: {
        petId: id,
        fromOwnerName: data.fromOwnerName,
        fromOwnerContact: data.fromOwnerContact,
        toOwnerName: data.toOwnerName,
        toOwnerContact: data.toOwnerContact,
        transferDate: new Date(data.transferDate),
        notes: data.notes,
      },
    });

    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建流转记录失败:', error);
    res.status(500).json({ error: '创建流转记录失败' });
  }
});

router.put('/:id/transfers/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = petTransferSchema.partial().parse(req.body);

    const record = await prisma.petTransfer.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const updated = await prisma.petTransfer.update({
      where: { id: recordId },
      data: {
        ...data,
        transferDate: data.transferDate ? new Date(data.transferDate) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新流转记录失败:', error);
    res.status(500).json({ error: '更新流转记录失败' });
  }
});

router.delete('/:id/transfers/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.petTransfer.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    await prisma.petTransfer.delete({ where: { id: recordId } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除流转记录失败:', error);
    res.status(500).json({ error: '删除流转记录失败' });
  }
});

router.get('/:id/vaccines', async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const records = await prisma.vaccineRecord.findMany({
      where: { petId: id },
      orderBy: { vaccinationDate: 'desc' },
    });

    res.json(records);
  } catch (error) {
    console.error('获取疫苗接种记录失败:', error);
    res.status(500).json({ error: '获取疫苗接种记录失败' });
  }
});

router.post('/:id/vaccines', async (req, res) => {
  try {
    const { id } = req.params;
    const data = vaccineRecordSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const record = await prisma.vaccineRecord.create({
      data: {
        petId: id,
        vaccineName: data.vaccineName,
        vaccinationDate: new Date(data.vaccinationDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        institution: data.institution,
        notes: data.notes,
      },
    });

    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建疫苗接种记录失败:', error);
    res.status(500).json({ error: '创建疫苗接种记录失败' });
  }
});

router.put('/:id/vaccines/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = vaccineRecordSchema.partial().parse(req.body);

    const record = await prisma.vaccineRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const updated = await prisma.vaccineRecord.update({
      where: { id: recordId },
      data: {
        ...data,
        vaccinationDate: data.vaccinationDate ? new Date(data.vaccinationDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新疫苗接种记录失败:', error);
    res.status(500).json({ error: '更新疫苗接种记录失败' });
  }
});

router.delete('/:id/vaccines/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.vaccineRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    await prisma.vaccineRecord.delete({ where: { id: recordId } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除疫苗接种记录失败:', error);
    res.status(500).json({ error: '删除疫苗接种记录失败' });
  }
});

router.get('/:id/daily-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const [logs, total] = await Promise.all([
      prisma.petDailyLog.findMany({
        where: { petId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.petDailyLog.count({ where: { petId: id } }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取日常日志失败:', error);
    res.status(500).json({ error: '获取日常日志失败' });
  }
});

router.post('/:id/daily-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const data = dailyLogSchema.parse(req.body);

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const log = await prisma.petDailyLog.create({
      data: {
        petId: id,
        content: data.content,
        imageUrl: data.imageUrl || null,
        mood: data.mood,
      },
    });

    res.status(201).json(log);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('创建日常日志失败:', error);
    res.status(500).json({ error: '创建日常日志失败' });
  }
});

router.put('/:id/daily-logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const data = dailyLogSchema.partial().parse(req.body);

    const log = await prisma.petDailyLog.findUnique({ where: { id: logId } });
    if (!log) {
      return res.status(404).json({ error: '日志不存在' });
    }

    const updated = await prisma.petDailyLog.update({
      where: { id: logId },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '数据验证失败', details: error.errors });
    }
    console.error('更新日常日志失败:', error);
    res.status(500).json({ error: '更新日常日志失败' });
  }
});

router.delete('/:id/daily-logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await prisma.petDailyLog.findUnique({ where: { id: logId } });
    if (!log) {
      return res.status(404).json({ error: '日志不存在' });
    }

    await prisma.petDailyLog.delete({ where: { id: logId } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除日常日志失败:', error);
    res.status(500).json({ error: '删除日常日志失败' });
  }
});

export default router;
