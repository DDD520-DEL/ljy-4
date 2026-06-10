import prisma from '../lib/prisma.js';

interface GenotypeInfo {
  genotype: string;
  zygosity?: string | null;
  allele1?: string | null;
  allele2?: string | null;
}

interface MarkerWithGenotype {
  id: string;
  markerName: string;
  geneName: string;
  disease: string;
  inheritance: string;
  riskLevel: string;
  description?: string | null;
  genotype?: string;
  zygosity?: string | null;
}

export async function getPetGeneticMarkers(petId: string): Promise<MarkerWithGenotype[]> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      geneMarkers: {
        include: {
          marker: true,
        },
      },
    },
  });

  if (!pet) return [];

  const allMarkers = await prisma.geneticMarker.findMany({
    where: { species: pet.species },
    orderBy: { markerName: 'asc' },
  });

  const markerDataMap = new Map<string, GenotypeInfo>();
  for (const gm of pet.geneMarkers) {
    markerDataMap.set(gm.markerId, {
      genotype: gm.genotype,
      zygosity: gm.zygosity,
      allele1: gm.allele1,
      allele2: gm.allele2,
    });
  }

  return allMarkers.map((marker) => {
    const data = markerDataMap.get(marker.id);
    return {
      id: marker.id,
      markerName: marker.markerName,
      geneName: marker.geneName,
      disease: marker.disease,
      inheritance: marker.inheritance,
      riskLevel: marker.riskLevel,
      description: marker.description,
      genotype: data?.genotype || '未检测',
      zygosity: data?.zygosity || null,
    };
  });
}

export function calculateIndividualRisk(marker: MarkerWithGenotype): {
  riskScore: number;
  riskLevel: string;
  explanation: string;
} {
  if (marker.genotype === '未检测') {
    return {
      riskScore: 0,
      riskLevel: 'unknown',
      explanation: '未进行基因检测，无法评估风险。',
    };
  }

  const isMutant = marker.genotype.includes('M') || marker.genotype.includes('m') || marker.zygosity === 'homozygous' || marker.zygosity === 'heterozygous';
  const isHomozygous = marker.zygosity === 'homozygous' || (marker.genotype.split('/').length === 2 && marker.genotype.split('/')[0] === marker.genotype.split('/')[1] && marker.genotype.includes('M'));
  const isHeterozygous = marker.zygosity === 'heterozygous';

  switch (marker.inheritance) {
    case 'autosomal_dominant':
      if (isHomozygous || isHeterozygous || isMutant) {
        return {
          riskScore: 0.95,
          riskLevel: 'high',
          explanation: `显性遗传模式，携带突变等位基因即可发病。基因型：${marker.genotype}`,
        };
      }
      return {
        riskScore: 0,
        riskLevel: 'low',
        explanation: '不携带致病突变，患病风险极低。',
      };

    case 'autosomal_recessive':
      if (isHomozygous || (marker.genotype === 'M/M') || (marker.genotype === 'm/m')) {
        return {
          riskScore: 0.9,
          riskLevel: 'high',
          explanation: `隐性遗传纯合突变，高度风险患病。基因型：${marker.genotype}`,
        };
      }
      if (isHeterozygous || marker.genotype === 'N/M' || marker.genotype === 'N/m') {
        return {
          riskScore: 0.05,
          riskLevel: 'carrier',
          explanation: `携带者状态，本身通常不发病，但可能将突变传递给后代。基因型：${marker.genotype}`,
        };
      }
      return {
        riskScore: 0,
        riskLevel: 'low',
        explanation: '不携带致病突变，患病风险极低。',
      };

    case 'x_linked':
      if (isHomozygous || (marker.genotype === 'M/M') || (marker.genotype === 'X^M/Y')) {
        return {
          riskScore: 0.9,
          riskLevel: 'high',
          explanation: `X连锁遗传，携带突变基因。基因型：${marker.genotype}`,
        };
      }
      if (isHeterozygous || marker.genotype === 'X^N/X^M') {
        return {
          riskScore: 0.3,
          riskLevel: 'medium',
          explanation: `女性携带者，可能表现出轻微症状或作为携带者传递。基因型：${marker.genotype}`,
        };
      }
      return {
        riskScore: 0,
        riskLevel: 'low',
        explanation: '不携带致病突变，患病风险极低。',
      };

    default:
      return {
        riskScore: 0,
        riskLevel: 'unknown',
        explanation: '未知遗传模式，无法准确评估风险。',
      };
  }
}

export async function calculateOffspringRisk(
  parent1Id: string,
  parent2Id: string
): Promise<{
  overallRisk: number;
  markerRisks: {
    markerName: string;
    disease: string;
    inheritance: string;
    parent1Genotype: string;
    parent2Genotype: string;
    offspringRisk: number;
    offspringRiskLevel: string;
    explanation: string;
  }[];
}> {
  const parent1 = await prisma.pet.findUnique({ where: { id: parent1Id } });
  const parent2 = await prisma.pet.findUnique({ where: { id: parent2Id } });

  if (!parent1 || !parent2) {
    return { overallRisk: 0, markerRisks: [] };
  }

  const markers = await prisma.geneticMarker.findMany({
    where: { species: parent1.species },
    orderBy: { markerName: 'asc' },
  });

  const p1Genotypes = new Map<string, string>();
  const p2Genotypes = new Map<string, string>();

  const p1MarkerData = await prisma.geneMarkerData.findMany({ where: { petId: parent1Id } });
  const p2MarkerData = await prisma.geneMarkerData.findMany({ where: { petId: parent2Id } });

  for (const m of p1MarkerData) p1Genotypes.set(m.markerId, m.genotype);
  for (const m of p2MarkerData) p2Genotypes.set(m.markerId, m.genotype);

  const markerRisks: {
    markerName: string;
    disease: string;
    inheritance: string;
    parent1Genotype: string;
    parent2Genotype: string;
    offspringRisk: number;
    offspringRiskLevel: string;
    explanation: string;
  }[] = [];

  let totalRisk = 0;
  let testedMarkers = 0;

  for (const marker of markers) {
    const p1Geno = p1Genotypes.get(marker.id) || '未检测';
    const p2Geno = p2Genotypes.get(marker.id) || '未检测';

    const risk = computeOffspringRiskForMarker(
      marker.inheritance,
      p1Geno,
      p2Geno,
      parent1.gender,
      parent2.gender
    );

    markerRisks.push({
      markerName: marker.markerName,
      disease: marker.disease,
      inheritance: marker.inheritance,
      parent1Genotype: p1Geno,
      parent2Genotype: p2Geno,
      offspringRisk: risk.risk,
      offspringRiskLevel: risk.level,
      explanation: risk.explanation,
    });

    if (p1Geno !== '未检测' && p2Geno !== '未检测') {
      testedMarkers++;
      totalRisk += risk.risk;
    }
  }

  const overallRisk = testedMarkers > 0 ? totalRisk / testedMarkers : 0;

  return {
    overallRisk: Math.round(overallRisk * 10000) / 10000,
    markerRisks,
  };
}

function computeOffspringRiskForMarker(
  inheritance: string,
  p1Geno: string,
  p2Geno: string,
  p1Gender: string,
  p2Gender: string
): { risk: number; level: string; explanation: string } {
  if (p1Geno === '未检测' || p2Geno === '未检测') {
    return {
      risk: 0,
      level: 'unknown',
      explanation: '父母一方或双方未进行该位点检测，无法评估后代风险。',
    };
  }

  const p1Carrier = p1Geno.includes('M') || p1Geno.includes('m') || p1Geno !== 'N/N';
  const p2Carrier = p2Geno.includes('M') || p2Geno.includes('m') || p2Geno !== 'N/N';
  const p1Homo = (p1Geno === 'M/M' || p1Geno === 'm/m');
  const p2Homo = (p2Geno === 'M/M' || p2Geno === 'm/m');
  const p1Hetero = p1Geno === 'N/M' || p1Geno === 'N/m';
  const p2Hetero = p2Geno === 'N/M' || p2Geno === 'N/m';

  switch (inheritance) {
    case 'autosomal_dominant': {
      if (p1Homo && p2Homo) {
        return { risk: 1.0, level: 'high', explanation: '双亲均为纯合突变，后代100%患病。' };
      }
      if ((p1Homo && !p2Carrier) || (!p1Carrier && p2Homo)) {
        return { risk: 1.0, level: 'high', explanation: '一方纯合突变，后代100%携带突变基因并患病。' };
      }
      if (p1Hetero && p2Hetero) {
        return { risk: 0.75, level: 'high', explanation: '双亲均为杂合子，后代75%概率携带突变并患病（50%杂合，25%纯合）。' };
      }
      if (p1Hetero || p2Hetero) {
        return { risk: 0.5, level: 'medium', explanation: '一方杂合突变，后代50%概率携带突变并患病。' };
      }
      return { risk: 0, level: 'low', explanation: '双亲均不携带突变，后代无患病风险。' };
    }

    case 'autosomal_recessive': {
      if (p1Homo && p2Homo) {
        return { risk: 1.0, level: 'high', explanation: '双亲均为纯合突变，后代100%患病。' };
      }
      if (p1Homo && p2Hetero) {
        return { risk: 0.5, level: 'high', explanation: '一方纯合+一方携带者，后代50%概率患病，50%概率为携带者。' };
      }
      if (p1Hetero && p2Homo) {
        return { risk: 0.5, level: 'high', explanation: '一方携带者+一方纯合，后代50%概率患病，50%概率为携带者。' };
      }
      if (p1Hetero && p2Hetero) {
        return { risk: 0.25, level: 'medium', explanation: '双亲均为携带者，后代25%概率患病，50%概率为携带者。' };
      }
      if (p1Hetero || p2Hetero) {
        return { risk: 0, level: 'carrier', explanation: '一方为携带者，后代不会患病，但有50%概率成为携带者。' };
      }
      return { risk: 0, level: 'low', explanation: '双亲均不携带突变，后代无患病风险。' };
    }

    case 'x_linked': {
      const maleParent = p1Gender === 'male' ? { geno: p1Geno, homo: p1Homo, hetero: p1Hetero, carrier: p1Carrier } :
        p2Gender === 'male' ? { geno: p2Geno, homo: p2Homo, hetero: p2Hetero, carrier: p2Carrier } : null;
      const femaleParent = p1Gender === 'female' ? { geno: p1Geno, homo: p1Homo, hetero: p1Hetero, carrier: p1Carrier } :
        p2Gender === 'female' ? { geno: p2Geno, homo: p2Homo, hetero: p2Hetero, carrier: p2Carrier } : null;

      if (maleParent?.carrier && femaleParent?.homo) {
        return { risk: 0.75, level: 'high', explanation: '雄性携带突变+雌性纯合，雄性后代100%患病，雌性后代100%患病。' };
      }
      if (maleParent?.carrier && femaleParent?.hetero) {
        return { risk: 0.5, level: 'medium', explanation: '雄性携带+雌性携带者，雄性后代50%患病，雌性后代50%患病。' };
      }
      if (maleParent?.carrier && !femaleParent?.carrier) {
        return { risk: 0.25, level: 'medium', explanation: '雄性携带突变，雌性不携带。雄性后代正常，雌性后代均为携带者。' };
      }
      if (!maleParent?.carrier && femaleParent?.homo) {
        return { risk: 0.5, level: 'high', explanation: '雄性正常+雌性纯合，雄性后代100%患病，雌性后代均为携带者。' };
      }
      if (!maleParent?.carrier && femaleParent?.hetero) {
        return { risk: 0.25, level: 'medium', explanation: '雄性正常+雌性携带者，雄性后代50%患病，雌性后代50%为携带者。' };
      }
      return { risk: 0, level: 'low', explanation: '双亲均不携带突变，后代无患病风险。' };
    }

    default:
      return { risk: 0, level: 'unknown', explanation: '未知遗传模式。' };
  }
}

export async function saveRiskPrediction(
  petId: string,
  disease: string,
  riskScore: number,
  riskLevel: string,
  predictionType: string,
  details?: any
) {
  return prisma.riskPrediction.create({
    data: {
      petId,
      disease,
      riskScore,
      riskLevel,
      predictionType,
      details,
    },
  });
}
