import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { calculateInbreedingCoefficient } from '../utils/inbreeding.js';
import { aggregateDiseaseByPet } from '../utils/diseaseAggregation.js';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const [
      breedDistribution,
      markerCarrierRates,
      diseaseFrequencies,
    ] = await Promise.all([
      computeBreedDistribution(),
      computeMarkerCarrierRates(),
      computeDiseaseFrequencies(),
    ]);

    const inbreedingDistribution = await computeInbreedingDistribution();

    res.json({
      breedDistribution,
      markerCarrierRates,
      inbreedingDistribution,
      diseaseFrequencies,
    });
  } catch (error) {
    console.error('获取种群遗传多样性统计失败:', error);
    res.status(500).json({ error: '获取种群遗传多样性统计失败' });
  }
});

async function computeBreedDistribution() {
  const pets = await prisma.pet.findMany({
    where: { status: 'active' },
    select: { species: true, breed: true },
  });

  const breedMap = new Map<string, { species: string; breed: string; count: number }>();

  for (const pet of pets) {
    const key = `${pet.species}|${pet.breed || '未知品种'}`;
    if (!breedMap.has(key)) {
      breedMap.set(key, {
        species: pet.species,
        breed: pet.breed || '未知品种',
        count: 0,
      });
    }
    breedMap.get(key)!.count++;
  }

  return Array.from(breedMap.values()).sort((a, b) => b.count - a.count);
}

async function computeMarkerCarrierRates() {
  const markers = await prisma.geneticMarker.findMany({
    orderBy: [{ species: 'asc' }, { markerName: 'asc' }],
  });

  if (markers.length === 0) return [];

  const allMarkerData = await prisma.geneMarkerData.findMany({
    select: {
      markerId: true,
      genotype: true,
      zygosity: true,
      pet: { select: { species: true } },
    },
  });

  const speciesPetCounts = await prisma.pet.groupBy({
    by: ['species'],
    where: { status: 'active' },
    _count: { id: true },
  });

  const speciesTotalMap = new Map<string, number>();
  for (const sc of speciesPetCounts) {
    speciesTotalMap.set(sc.species, sc._count.id);
  }

  const markerDataByMarker = new Map<string, typeof allMarkerData>();
  for (const md of allMarkerData) {
    if (!markerDataByMarker.has(md.markerId)) {
      markerDataByMarker.set(md.markerId, []);
    }
    markerDataByMarker.get(md.markerId)!.push(md);
  }

  return markers.map((marker) => {
    const data = markerDataByMarker.get(marker.id) || [];
    const totalInSpecies = speciesTotalMap.get(marker.species) || 0;
    const testedCount = data.length;
    const carrierCount = data.filter((d) => {
      const isCarrier =
        d.zygosity === 'heterozygous' ||
        d.genotype === 'N/M' ||
        d.genotype === 'N/m';
      return isCarrier;
    }).length;
    const affectedCount = data.filter((d) => {
      const isAffected =
        d.zygosity === 'homozygous' ||
        d.genotype === 'M/M' ||
        d.genotype === 'm/m';
      return isAffected;
    }).length;
    const clearCount = data.filter((d) => {
      const isClear =
        d.zygosity === null && d.genotype === 'N/N';
      return isClear;
    }).length;

    const carrierRate = testedCount > 0 ? carrierCount / testedCount : 0;
    const affectedRate = testedCount > 0 ? affectedCount / testedCount : 0;
    const detectionRate = totalInSpecies > 0 ? testedCount / totalInSpecies : 0;

    return {
      markerId: marker.id,
      markerName: marker.markerName,
      geneName: marker.geneName,
      disease: marker.disease,
      species: marker.species,
      inheritance: marker.inheritance,
      riskLevel: marker.riskLevel,
      totalInSpecies,
      testedCount,
      carrierCount,
      affectedCount,
      clearCount,
      carrierRate: Math.round(carrierRate * 10000) / 10000,
      affectedRate: Math.round(affectedRate * 10000) / 10000,
      detectionRate: Math.round(detectionRate * 10000) / 10000,
    };
  });
}

async function computeInbreedingDistribution() {
  const petsWithParents = await prisma.pet.findMany({
    where: { status: 'active' },
    include: {
      childRelations: {
        select: { relationType: true },
      },
    },
  });

  const petsWithBothParents = petsWithParents.filter(
    (p) =>
      p.childRelations.some((r) => r.relationType === 'father') &&
      p.childRelations.some((r) => r.relationType === 'mother')
  );

  const results: {
    petId: string;
    petName: string;
    species: string;
    breed: string | null;
    inbreedingCoefficient: number;
    riskLevel: string;
  }[] = [];

  for (const pet of petsWithBothParents) {
    try {
      const coeff = await calculateInbreedingCoefficient(pet.id);
      let riskLevel = 'low';
      if (coeff > 0.25) riskLevel = 'very_high';
      else if (coeff > 0.125) riskLevel = 'high';
      else if (coeff > 0.0625) riskLevel = 'medium';

      results.push({
        petId: pet.id,
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        inbreedingCoefficient: coeff,
        riskLevel,
      });
    } catch {
      results.push({
        petId: pet.id,
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        inbreedingCoefficient: 0,
        riskLevel: 'unknown',
      });
    }
  }

  const distribution = {
    low: 0,
    medium: 0,
    high: 0,
    very_high: 0,
    unknown: 0,
  };

  for (const r of results) {
    distribution[r.riskLevel as keyof typeof distribution]++;
  }

  const coefficients = results.map((r) => r.inbreedingCoefficient);
  const avgCoeff = coefficients.length > 0
    ? coefficients.reduce((a, b) => a + b, 0) / coefficients.length
    : 0;
  const maxCoeff = coefficients.length > 0 ? Math.max(...coefficients) : 0;

  const buckets: { range: string; count: number }[] = [
    { range: '0', count: 0 },
    { range: '0~6.25%', count: 0 },
    { range: '6.25%~12.5%', count: 0 },
    { range: '12.5%~25%', count: 0 },
    { range: '>25%', count: 0 },
  ];

  for (const c of coefficients) {
    if (c === 0) buckets[0].count++;
    else if (c <= 0.0625) buckets[1].count++;
    else if (c <= 0.125) buckets[2].count++;
    else if (c <= 0.25) buckets[3].count++;
    else buckets[4].count++;
  }

  return {
    totalPets: petsWithParents.length,
    petsWithBothParents: petsWithBothParents.length,
    averageCoefficient: Math.round(avgCoeff * 10000) / 10000,
    maxCoefficient: Math.round(maxCoeff * 10000) / 10000,
    distribution,
    buckets,
    details: results,
  };
}

async function computeDiseaseFrequencies() {
  const markerData = await prisma.geneMarkerData.findMany({
    include: {
      marker: {
        select: {
          markerName: true,
          disease: true,
          species: true,
          inheritance: true,
        },
      },
    },
  });

  const speciesPetCounts = await prisma.pet.groupBy({
    by: ['species'],
    where: { status: 'active' },
    _count: { id: true },
  });

  const speciesTotalMap = new Map<string, number>();
  for (const sc of speciesPetCounts) {
    speciesTotalMap.set(sc.species, sc._count.id);
  }

  const aggregated = aggregateDiseaseByPet(
    markerData as any[]
  );

  return aggregated.map((d) => {
    const totalInSpecies = speciesTotalMap.get(d.species) || 0;
    const detectionFrequency = totalInSpecies > 0
      ? d.affectedCount / totalInSpecies
      : 0;
    const carrierFrequency = totalInSpecies > 0
      ? d.carrierCount / totalInSpecies
      : 0;

    return {
      ...d,
      totalInSpecies,
      detectionFrequency: Math.round(detectionFrequency * 10000) / 10000,
      carrierFrequency: Math.round(carrierFrequency * 10000) / 10000,
    };
  }).sort((a, b) => b.detectionFrequency - a.detectionFrequency);
}

export default router;
