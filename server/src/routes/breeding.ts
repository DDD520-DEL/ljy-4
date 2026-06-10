import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { calculateInbreedingCoefficient, calculatePairInbreeding } from '../utils/inbreeding.js';
import { calculateOffspringRisk } from '../utils/geneticRisk.js';

const router = Router();

function getInbreedingInterpretation(coeff: number): string {
  if (coeff === 0) {
    return '无亲缘关系，近交风险极低。';
  } else if (coeff <= 0.03125) {
    return '远亲关系，近交风险较低，通常可接受。';
  } else if (coeff <= 0.0625) {
    return '表亲级亲缘关系，存在一定近交风险，建议谨慎考虑。';
  } else if (coeff <= 0.125) {
    return '半同胞或叔侄级亲缘关系，近交风险中等，可能增加遗传病概率。';
  } else if (coeff <= 0.25) {
    return '全同胞或亲子级亲缘关系，近交风险高，强烈不建议繁殖。';
  } else {
    return '极高近交风险，严重增加遗传病和健康问题概率，严禁繁殖。';
  }
}

function getInbreedingRiskLevel(coeff: number): string {
  if (coeff > 0.25) return 'very_high';
  if (coeff > 0.125) return 'high';
  if (coeff > 0.0625) return 'medium';
  return 'low';
}

function parseRiskAssessment(riskAssessment: string | null): any {
  if (!riskAssessment) return null;
  try {
    return JSON.parse(riskAssessment);
  } catch {
    return riskAssessment;
  }
}

router.get('/breeding-pets', async (req, res) => {
  try {
    const { species, gender } = req.query;

    const where: any = {
      isBreeding: true,
      status: 'active',
    };

    if (species && species !== 'all') {
      where.species = species as string;
    }
    if (gender && gender !== 'all') {
      where.gender = gender as string;
    }

    const pets = await prisma.pet.findMany({
      where,
      orderBy: [{ species: 'asc' }, { breed: 'asc' }, { name: 'asc' }],
      include: {
        childRelations: {
          include: { parent: true },
        },
        geneMarkers: {
          include: {
            marker: true,
          },
        },
      },
    });

    res.json(pets);
  } catch (error) {
    console.error('获取种畜列表失败:', error);
    res.status(500).json({ error: '获取种畜列表失败' });
  }
});

router.get('/inbreeding/:petId', async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const coefficient = await calculateInbreedingCoefficient(petId);

    let riskLevel = 'low';
    if (coefficient > 0.25) riskLevel = 'very_high';
    else if (coefficient > 0.125) riskLevel = 'high';
    else if (coefficient > 0.0625) riskLevel = 'medium';

    res.json({
      petId,
      petName: pet.name,
      inbreedingCoefficient: coefficient,
      percentage: (coefficient * 100).toFixed(2) + '%',
      riskLevel,
      interpretation: getInbreedingInterpretation(coefficient),
    });
  } catch (error) {
    console.error('计算近交系数失败:', error);
    res.status(500).json({ error: '计算近交系数失败' });
  }
});

router.post('/pair/inbreeding', async (req, res) => {
  try {
    const { maleId, femaleId } = req.body;

    if (!maleId || !femaleId) {
      return res.status(400).json({ error: '请提供雄性和雌性宠物ID' });
    }

    const male = await prisma.pet.findUnique({ where: { id: maleId } });
    const female = await prisma.pet.findUnique({ where: { id: femaleId } });

    if (!male || !female) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const kinshipCoeff = await calculatePairInbreeding(maleId, femaleId);

    let riskLevel = 'low';
    if (kinshipCoeff > 0.25) riskLevel = 'very_high';
    else if (kinshipCoeff > 0.125) riskLevel = 'high';
    else if (kinshipCoeff > 0.0625) riskLevel = 'medium';

    const offspringRisk = await calculateOffspringRisk(maleId, femaleId);

    const breedingPair = await prisma.breedingPair.findFirst({
      where: { maleId, femaleId },
    });

    if (breedingPair) {
      await prisma.breedingPair.update({
        where: { id: breedingPair.id },
        data: {
          inbreedingCoefficient: kinshipCoeff,
          riskAssessment: JSON.stringify({
            geneticRisk: offspringRisk.overallRisk,
            inbreedingRisk: riskLevel,
          }),
        },
      });
    }

    res.json({
      male: { id: male.id, name: male.name, breed: male.breed },
      female: { id: female.id, name: female.name, breed: female.breed },
      kinshipCoefficient: kinshipCoeff,
      offspringInbreedingCoefficient: kinshipCoeff,
      percentage: (kinshipCoeff * 100).toFixed(2) + '%',
      inbreedingRiskLevel: riskLevel,
      inbreedingInterpretation: getInbreedingInterpretation(kinshipCoeff),
      geneticRisk: {
        overall: offspringRisk.overallRisk,
        overallRiskScore: offspringRisk.overallRiskScore,
        summary: offspringRisk.summary,
      },
    });
  } catch (error) {
    console.error('计算配对近交系数失败:', error);
    res.status(500).json({ error: '计算配对近交系数失败' });
  }
});

router.get('/breeding-pairs', async (req, res) => {
  try {
    const pairs = await prisma.breedingPair.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        male: true,
        female: true,
      },
    });

    const parsedPairs = pairs.map((pair) => ({
      ...pair,
      riskAssessment: parseRiskAssessment(pair.riskAssessment),
    }));

    res.json(parsedPairs);
  } catch (error) {
    console.error('获取配种对列表失败:', error);
    res.status(500).json({ error: '获取配种对列表失败' });
  }
});

router.post('/breeding-pairs', async (req, res) => {
  try {
    const { maleId, femaleId, name, notes } = req.body;

    if (!maleId || !femaleId) {
      return res.status(400).json({ error: '请提供雄性和雌性宠物ID' });
    }

    const male = await prisma.pet.findUnique({ where: { id: maleId } });
    const female = await prisma.pet.findUnique({ where: { id: femaleId } });

    if (!male || !female) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const existing = await prisma.breedingPair.findFirst({
      where: { maleId, femaleId },
    });

    if (existing) {
      return res.status(409).json({ error: '该配种对已存在' });
    }

    const kinshipCoeff = await calculatePairInbreeding(maleId, femaleId);
    const offspringRisk = await calculateOffspringRisk(maleId, femaleId);

    const pair = await prisma.breedingPair.create({
      data: {
        maleId,
        femaleId,
        name: name || `${male.name} × ${female.name}`,
        notes,
        inbreedingCoefficient: kinshipCoeff,
        riskAssessment: JSON.stringify({
          geneticRisk: offspringRisk.overallRisk,
          inbreedingRisk: getInbreedingRiskLevel(kinshipCoeff),
        }),
      },
      include: {
        male: true,
        female: true,
      },
    });

    res.status(201).json({
      ...pair,
      riskAssessment: parseRiskAssessment(pair.riskAssessment),
    });
  } catch (error) {
    console.error('创建配种对失败:', error);
    res.status(500).json({ error: '创建配种对失败' });
  }
});

router.delete('/breeding-pairs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.breedingPair.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除配种对失败:', error);
    res.status(500).json({ error: '删除配种对失败' });
  }
});

export default router;
