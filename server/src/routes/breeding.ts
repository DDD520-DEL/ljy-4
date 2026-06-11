import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { calculateInbreedingCoefficient, calculatePairInbreeding } from '../utils/inbreeding.js';
import { calculateOffspringRisk } from '../utils/geneticRisk.js';
import { checkPetAlerts } from '../utils/breedingAlerts.js';

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

    await Promise.all([
      checkPetAlerts(maleId),
      checkPetAlerts(femaleId),
    ]);
  } catch (error) {
    console.error('创建配种对失败:', error);
    res.status(500).json({ error: '创建配种对失败' });
  }
});

router.get('/breeding-pairs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pair = await prisma.breedingPair.findUnique({
      where: { id },
      include: {
        male: true,
        female: true,
      },
    });

    if (!pair) {
      return res.status(404).json({ error: '配种对不存在' });
    }

    res.json({
      ...pair,
      riskAssessment: parseRiskAssessment(pair.riskAssessment),
    });
  } catch (error) {
    console.error('获取配种对详情失败:', error);
    res.status(500).json({ error: '获取配种对详情失败' });
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

router.get('/recommendations', async (req, res) => {
  try {
    const { species, maxInbreedingCoeff, limit } = req.query;

    const maxInbreeding = maxInbreedingCoeff
      ? parseFloat(maxInbreedingCoeff as string)
      : 0.0625;
    const resultLimit = limit ? parseInt(limit as string) : 20;

    const where: any = {
      isBreeding: true,
      status: 'active',
    };

    if (species && species !== 'all') {
      where.species = species as string;
    }

    const breedingPets = await prisma.pet.findMany({
      where,
      orderBy: [{ species: 'asc' }, { name: 'asc' }],
      include: {
        geneMarkers: {
          include: { marker: true },
        },
        childRelations: {
          include: { parent: true },
        },
      },
    });

    const speciesGroups = new Map<string, { males: typeof breedingPets; females: typeof breedingPets }>();

    for (const pet of breedingPets) {
      if (!speciesGroups.has(pet.species)) {
        speciesGroups.set(pet.species, { males: [], females: [] });
      }
      const group = speciesGroups.get(pet.species)!;
      if (pet.gender === 'male') {
        group.males.push(pet);
      } else if (pet.gender === 'female') {
        group.females.push(pet);
      }
    }

    const recommendations: any[] = [];

    for (const [sp, group] of speciesGroups) {
      const { males, females } = group;

      for (const male of males) {
        for (const female of females) {
          try {
            const inbreedingCoeff = await calculatePairInbreeding(male.id, female.id);

            if (inbreedingCoeff > maxInbreeding) {
              continue;
            }

            const offspringRisk = await calculateOffspringRisk(male.id, female.id);

            const markerRisks = offspringRisk.markerRisks || [];
            const highRiskCount = markerRisks.filter((m: any) => m.offspringRiskLevel === 'high').length;
            const mediumRiskCount = markerRisks.filter((m: any) => m.offspringRiskLevel === 'medium').length;
            const lowRiskCount = markerRisks.filter((m: any) => m.offspringRiskLevel === 'low').length;
            const carrierCount = markerRisks.filter((m: any) => m.offspringRiskLevel === 'carrier').length;
            const unknownCount = markerRisks.filter((m: any) => m.offspringRiskLevel === 'unknown').length;

            let geneticRiskLevel = 'low';
            if (highRiskCount > 0) geneticRiskLevel = 'high';
            else if (mediumRiskCount > 0) geneticRiskLevel = 'medium';
            else if (carrierCount > 0) geneticRiskLevel = 'carrier';

            const riskSummary = {
              total: markerRisks.length,
              highRisk: highRiskCount,
              mediumRisk: mediumRiskCount,
              lowRisk: lowRiskCount,
              carrier: carrierCount,
              unknown: unknownCount,
            };

            const overallRiskScore = offspringRisk.overallRisk || 0;

            const inbreedingRiskLevel = getInbreedingRiskLevel(inbreedingCoeff);

            const combinedScore = calculateCombinedRiskScore(
              overallRiskScore,
              inbreedingCoeff
            );

            const overallRiskLevel = determineOverallRiskLevel(
              overallRiskScore,
              geneticRiskLevel,
              inbreedingRiskLevel
            );

            recommendations.push({
              id: `${male.id}_${female.id}`,
              male: {
                id: male.id,
                name: male.name,
                breed: male.breed,
                species: male.species,
                avatarUrl: male.avatarUrl,
              },
              female: {
                id: female.id,
                name: female.name,
                breed: female.breed,
                species: female.species,
                avatarUrl: female.avatarUrl,
              },
              species: sp,
              inbreedingCoefficient: inbreedingCoeff,
              inbreedingRiskLevel,
              overallGeneticRiskScore: overallRiskScore,
              overallGeneticRiskLevel: geneticRiskLevel,
              combinedRiskScore: combinedScore,
              overallRiskLevel,
              riskSummary,
              topRisks: offspringRisk.markerRisks
                ?.filter((m: any) => m.offspringRiskLevel === 'high' || m.offspringRiskLevel === 'medium')
                .slice(0, 3) || [],
            });
          } catch (e) {
            console.error(`计算配对 ${male.name} × ${female.name} 失败:`, e);
          }
        }
      }
    }

    recommendations.sort((a, b) => {
      const riskOrder: Record<string, number> = {
        low: 0,
        carrier: 1,
        medium: 2,
        high: 3,
        very_high: 4,
        unknown: 5,
      };

      const levelDiff = riskOrder[a.overallRiskLevel] - riskOrder[b.overallRiskLevel];
      if (levelDiff !== 0) return levelDiff;

      const scoreDiff = a.combinedRiskScore - b.combinedRiskScore;
      if (scoreDiff !== 0) return scoreDiff;

      return a.inbreedingCoefficient - b.inbreedingCoefficient;
    });

    const limitedRecommendations = recommendations.slice(0, resultLimit);

    res.json({
      total: recommendations.length,
      limit: resultLimit,
      recommendations: limitedRecommendations,
    });
  } catch (error) {
    console.error('获取繁殖推荐失败:', error);
    res.status(500).json({ error: '获取繁殖推荐失败' });
  }
});

function calculateCombinedRiskScore(geneticRiskScore: number, inbreedingCoeff: number): number {
  const geneticWeight = 0.7;
  const inbreedingWeight = 0.3;

  const normalizedInbreeding = Math.min(inbreedingCoeff / 0.25, 1);

  return geneticRiskScore * geneticWeight + normalizedInbreeding * inbreedingWeight;
}

function determineOverallRiskLevel(
  geneticRiskScore: number,
  geneticRiskLevel: string,
  inbreedingRiskLevel: string
): string {
  const riskLevels = ['low', 'carrier', 'medium', 'high', 'very_high'];
  const inbreedingIndex = riskLevels.indexOf(inbreedingRiskLevel);
  const geneticIndex = riskLevels.indexOf(geneticRiskLevel);

  const maxIndex = Math.max(inbreedingIndex, geneticIndex);
  return riskLevels[maxIndex] || 'unknown';
}

router.post('/breeding-pairs/:id/litters', async (req, res) => {
  try {
    const { id } = req.params;
    const { birthDate, totalCount, aliveCount, deadCount, notes, puppies, healthComparison } = req.body;

    if (!birthDate || !totalCount || totalCount <= 0) {
      return res.status(400).json({ error: '请提供有效的出生日期和产仔数量' });
    }

    const pair = await prisma.breedingPair.findUnique({
      where: { id },
      include: { male: true, female: true },
    });

    if (!pair) {
      return res.status(404).json({ error: '配种对不存在' });
    }

    const finalAliveCount = aliveCount ?? totalCount;
    const finalDeadCount = deadCount ?? (totalCount - finalAliveCount);

    const result = await prisma.$transaction(async (tx) => {
      const litter = await tx.litterRecord.create({
        data: {
          breedingPairId: id,
          birthDate: new Date(birthDate),
          totalCount,
          aliveCount: finalAliveCount,
          deadCount: finalDeadCount,
          notes,
          healthComparison: healthComparison ? JSON.stringify(healthComparison) : null,
        },
      });

      const createdPuppies = [];
      const createdRelations = [];

      if (puppies && Array.isArray(puppies) && puppies.length > 0) {
        for (const puppy of puppies) {
          const newPet = await tx.pet.create({
            data: {
              name: puppy.name || `幼崽${createdPuppies.length + 1}`,
              species: pair.male.species,
              breed: pair.male.breed,
              gender: puppy.gender || 'unknown',
              birthDate: new Date(birthDate),
              color: puppy.color,
              weight: puppy.birthWeight,
              description: `父本: ${pair.male.name}, 母本: ${pair.female.name}`,
              status: puppy.status === 'dead' ? 'deceased' : 'active',
            },
          });

          const puppyRecord = await tx.puppyRecord.create({
            data: {
              litterRecordId: litter.id,
              petId: newPet.id,
              name: puppy.name,
              gender: puppy.gender || 'unknown',
              birthWeight: puppy.birthWeight,
              color: puppy.color,
              status: puppy.status || 'alive',
              healthStatus: puppy.healthStatus || 'normal',
              healthNotes: puppy.healthNotes,
            },
          });

          createdPuppies.push({ ...puppyRecord, pet: newPet });

          const fatherRel = await tx.parentRelation.create({
            data: {
              parentId: pair.maleId,
              childId: newPet.id,
              relationType: 'father',
            },
          });
          createdRelations.push(fatherRel);

          const motherRel = await tx.parentRelation.create({
            data: {
              parentId: pair.femaleId,
              childId: newPet.id,
              relationType: 'mother',
            },
          });
          createdRelations.push(motherRel);
        }
      }

      return { litter, puppies: createdPuppies, relations: createdRelations };
    });

    res.status(201).json({
      ...result.litter,
      puppies: result.puppies,
      healthComparison: result.litter.healthComparison ? JSON.parse(result.litter.healthComparison) : null,
    });
  } catch (error) {
    console.error('创建窝产记录失败:', error);
    res.status(500).json({ error: '创建窝产记录失败' });
  }
});

router.get('/breeding-pairs/:id/litters', async (req, res) => {
  try {
    const { id } = req.params;

    const pair = await prisma.breedingPair.findUnique({ where: { id } });
    if (!pair) {
      return res.status(404).json({ error: '配种对不存在' });
    }

    const litters = await prisma.litterRecord.findMany({
      where: { breedingPairId: id },
      orderBy: { birthDate: 'desc' },
      include: {
        puppies: {
          include: {
            pet: true,
          },
        },
      },
    });

    const parsedLitters = litters.map((litter) => ({
      ...litter,
      healthComparison: litter.healthComparison ? JSON.parse(litter.healthComparison) : null,
    }));

    res.json(parsedLitters);
  } catch (error) {
    console.error('获取窝产记录列表失败:', error);
    res.status(500).json({ error: '获取窝产记录列表失败' });
  }
});

router.get('/litters/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const litter = await prisma.litterRecord.findUnique({
      where: { id },
      include: {
        breedingPair: {
          include: {
            male: true,
            female: true,
          },
        },
        puppies: {
          include: {
            pet: true,
          },
        },
      },
    });

    if (!litter) {
      return res.status(404).json({ error: '窝产记录不存在' });
    }

    res.json({
      ...litter,
      healthComparison: litter.healthComparison ? JSON.parse(litter.healthComparison) : null,
    });
  } catch (error) {
    console.error('获取窝产记录详情失败:', error);
    res.status(500).json({ error: '获取窝产记录详情失败' });
  }
});

router.put('/litters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { birthDate, totalCount, aliveCount, deadCount, notes, healthComparison } = req.body;

    const litter = await prisma.litterRecord.findUnique({ where: { id } });
    if (!litter) {
      return res.status(404).json({ error: '窝产记录不存在' });
    }

    const updateData: any = {};
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (totalCount !== undefined) updateData.totalCount = totalCount;
    if (aliveCount !== undefined) updateData.aliveCount = aliveCount;
    if (deadCount !== undefined) updateData.deadCount = deadCount;
    if (notes !== undefined) updateData.notes = notes;
    if (healthComparison !== undefined) {
      updateData.healthComparison = typeof healthComparison === 'string'
        ? healthComparison
        : JSON.stringify(healthComparison);
    }

    const updated = await prisma.litterRecord.update({
      where: { id },
      data: updateData,
      include: {
        puppies: {
          include: { pet: true },
        },
      },
    });

    res.json({
      ...updated,
      healthComparison: updated.healthComparison ? JSON.parse(updated.healthComparison) : null,
    });
  } catch (error) {
    console.error('更新窝产记录失败:', error);
    res.status(500).json({ error: '更新窝产记录失败' });
  }
});

router.delete('/litters/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const litter = await prisma.litterRecord.findUnique({
      where: { id },
      include: { puppies: true },
    });
    if (!litter) {
      return res.status(404).json({ error: '窝产记录不存在' });
    }

    await prisma.$transaction(async (tx) => {
      for (const puppy of litter.puppies) {
        if (puppy.petId) {
          await tx.parentRelation.deleteMany({
            where: { childId: puppy.petId },
          });
          await tx.pet.delete({
            where: { id: puppy.petId },
          });
        }
      }
      await tx.litterRecord.delete({ where: { id } });
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除窝产记录失败:', error);
    res.status(500).json({ error: '删除窝产记录失败' });
  }
});

router.put('/puppies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, birthWeight, color, status, healthStatus, healthNotes } = req.body;

    const puppy = await prisma.puppyRecord.findUnique({ where: { id } });
    if (!puppy) {
      return res.status(404).json({ error: '仔宠记录不存在' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (gender !== undefined) updateData.gender = gender;
    if (birthWeight !== undefined) updateData.birthWeight = birthWeight;
    if (color !== undefined) updateData.color = color;
    if (status !== undefined) updateData.status = status;
    if (healthStatus !== undefined) updateData.healthStatus = healthStatus;
    if (healthNotes !== undefined) updateData.healthNotes = healthNotes;

    const updated = await prisma.puppyRecord.update({
      where: { id },
      data: updateData,
      include: { pet: true },
    });

    if (updated.petId && (name || gender || birthWeight || color || status)) {
      const petUpdateData: any = {};
      if (name) petUpdateData.name = name;
      if (gender) petUpdateData.gender = gender;
      if (birthWeight) petUpdateData.weight = birthWeight;
      if (color) petUpdateData.color = color;
      if (status) petUpdateData.status = status === 'dead' ? 'deceased' : 'active';

      await prisma.pet.update({
        where: { id: updated.petId },
        data: petUpdateData,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('更新仔宠记录失败:', error);
    res.status(500).json({ error: '更新仔宠记录失败' });
  }
});

export default router;
