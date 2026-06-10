import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { getPetGeneticMarkers, calculateIndividualRisk, calculateOffspringRisk } from '../utils/geneticRisk.js';

const router = Router();

router.get('/markers', async (req, res) => {
  try {
    const { species } = req.query;

    const where: any = {};
    if (species && species !== 'all') {
      where.species = species as string;
    }

    const markers = await prisma.geneticMarker.findMany({
      where,
      orderBy: [{ species: 'asc' }, { markerName: 'asc' }],
    });

    res.json(markers);
  } catch (error) {
    console.error('获取遗传标记列表失败:', error);
    res.status(500).json({ error: '获取遗传标记列表失败' });
  }
});

router.get('/markers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const marker = await prisma.geneticMarker.findUnique({
      where: { id },
    });

    if (!marker) {
      return res.status(404).json({ error: '遗传标记不存在' });
    }

    res.json(marker);
  } catch (error) {
    console.error('获取遗传标记详情失败:', error);
    res.status(500).json({ error: '获取遗传标记详情失败' });
  }
});

router.get('/pet/:petId/markers', async (req, res) => {
  try {
    const { petId } = req.params;

    const markers = await getPetGeneticMarkers(petId);

    res.json(markers);
  } catch (error) {
    console.error('获取宠物基因标记失败:', error);
    res.status(500).json({ error: '获取宠物基因标记失败' });
  }
});

router.get('/pet/:petId/risk', async (req, res) => {
  try {
    const { petId } = req.params;

    const markers = await getPetGeneticMarkers(petId);

    const riskResults = markers.map((marker) => {
      const risk = calculateIndividualRisk(marker);
      return {
        ...marker,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        explanation: risk.explanation,
      };
    });

    const highRiskCount = riskResults.filter((r) => r.riskLevel === 'high').length;
    const mediumRiskCount = riskResults.filter((r) => r.riskLevel === 'medium').length;
    const carrierCount = riskResults.filter((r) => r.riskLevel === 'carrier').length;
    const testedCount = riskResults.filter((r) => r.genotype !== '未检测').length;

    let overallRiskLevel = 'low';
    if (highRiskCount > 0) overallRiskLevel = 'high';
    else if (mediumRiskCount > 0 || carrierCount > 0) overallRiskLevel = 'medium';

    res.json({
      overallRisk: overallRiskLevel,
      summary: {
        total: markers.length,
        tested: testedCount,
        highRisk: highRiskCount,
        mediumRisk: mediumRiskCount,
        carrier: carrierCount,
        lowRisk: testedCount - highRiskCount - mediumRiskCount - carrierCount,
      },
      markers: riskResults,
    });
  } catch (error) {
    console.error('计算个体风险失败:', error);
    res.status(500).json({ error: '计算个体风险失败' });
  }
});

router.get('/offspring/risk', async (req, res) => {
  try {
    const { parent1Id, parent2Id } = req.query;

    if (!parent1Id || !parent2Id) {
      return res.status(400).json({ error: '请提供两个亲本的ID' });
    }

    const result = await calculateOffspringRisk(parent1Id as string, parent2Id as string);

    let overallRiskLevel = 'low';
    const highRiskCount = result.markerRisks.filter((m) => m.offspringRiskLevel === 'high').length;
    const mediumRiskCount = result.markerRisks.filter((m) => m.offspringRiskLevel === 'medium').length;

    if (highRiskCount > 0) overallRiskLevel = 'high';
    else if (mediumRiskCount > 0) overallRiskLevel = 'medium';

    res.json({
      overallRisk: overallRiskLevel,
      overallRiskScore: result.overallRisk,
      markerRisks: result.markerRisks,
      summary: {
        total: result.markerRisks.length,
        highRisk: highRiskCount,
        mediumRisk: mediumRiskCount,
        lowRisk: result.markerRisks.filter((m) => m.offspringRiskLevel === 'low').length,
        carrier: result.markerRisks.filter((m) => m.offspringRiskLevel === 'carrier').length,
        unknown: result.markerRisks.filter((m) => m.offspringRiskLevel === 'unknown').length,
      },
    });
  } catch (error) {
    console.error('计算后代风险失败:', error);
    res.status(500).json({ error: '计算后代风险失败' });
  }
});

export default router;
