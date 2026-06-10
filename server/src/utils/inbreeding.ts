import prisma from '../lib/prisma.js';

interface AncestorNode {
  id: string;
  name: string;
  parents: string[];
  generation: number;
}

export async function buildPedigree(petId: string, maxGenerations: number = 5): Promise<Map<string, AncestorNode>> {
  const pedigree = new Map<string, AncestorNode>();
  const queue: { id: string; generation: number }[] = [{ id: petId, generation: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id) || current.generation > maxGenerations) continue;
    visited.add(current.id);

    const pet = await prisma.pet.findUnique({
      where: { id: current.id },
      include: {
        childRelations: {
          include: { parent: true },
        },
      },
    });

    if (!pet) continue;

    const parentIds = pet.childRelations.map((r) => r.parentId);

    pedigree.set(current.id, {
      id: current.id,
      name: pet.name,
      parents: parentIds,
      generation: current.generation,
    });

    for (const parentId of parentIds) {
      queue.push({ id: parentId, generation: current.generation + 1 });
    }
  }

  return pedigree;
}

function findCommonAncestors(
  pedigreeA: Map<string, AncestorNode>,
  pedigreeB: Map<string, AncestorNode>
): string[] {
  const ancestorsA = new Set(pedigreeA.keys());
  const ancestorsB = new Set(pedigreeB.keys());
  const common: string[] = [];

  for (const id of ancestorsA) {
    if (ancestorsB.has(id)) {
      common.push(id);
    }
  }

  return common;
}

export async function calculateInbreedingCoefficient(petId: string): Promise<number> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      childRelations: {
        include: { parent: true },
      },
    },
  });

  if (!pet || pet.childRelations.length < 2) {
    return 0;
  }

  const fatherRelation = pet.childRelations.find((r) => r.relationType === 'father');
  const motherRelation = pet.childRelations.find((r) => r.relationType === 'mother');

  if (!fatherRelation || !motherRelation) {
    return 0;
  }

  const fatherPedigree = await buildPedigree(fatherRelation.parentId, 8);
  const motherPedigree = await buildPedigree(motherRelation.parentId, 8);

  const commonAncestors = findCommonAncestors(fatherPedigree, motherPedigree);

  if (commonAncestors.length === 0) {
    return 0;
  }

  let inbreedingCoeff = 0;

  for (const ancestorId of commonAncestors) {
    const fatherGen = fatherPedigree.get(ancestorId)?.generation ?? -1;
    const motherGen = motherPedigree.get(ancestorId)?.generation ?? -1;

    if (fatherGen >= 0 && motherGen >= 0) {
      const pathLength = fatherGen + motherGen + 1;
      const caInbreeding = await calculateInbreedingCoefficientRecursive(ancestorId, new Set());
      const contribution = Math.pow(0.5, pathLength) * (1 + caInbreeding);
      inbreedingCoeff += contribution;
    }
  }

  return Math.round(inbreedingCoeff * 10000) / 10000;
}

async function calculateInbreedingCoefficientRecursive(
  petId: string,
  visited: Set<string>
): Promise<number> {
  if (visited.has(petId)) return 0;
  visited.add(petId);

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: {
      childRelations: {
        include: { parent: true },
      },
    },
  });

  if (!pet || pet.childRelations.length < 2) return 0;

  const fatherRelation = pet.childRelations.find((r) => r.relationType === 'father');
  const motherRelation = pet.childRelations.find((r) => r.relationType === 'mother');

  if (!fatherRelation || !motherRelation) return 0;

  const fatherPedigree = await buildPedigreeLimited(fatherRelation.parentId, 5, new Set([petId]));
  const motherPedigree = await buildPedigreeLimited(motherRelation.parentId, 5, new Set([petId]));

  const commonAncestors = findCommonAncestors(fatherPedigree, motherPedigree);

  let inbreedingCoeff = 0;
  for (const ancestorId of commonAncestors) {
    const fatherGen = fatherPedigree.get(ancestorId)?.generation ?? -1;
    const motherGen = motherPedigree.get(ancestorId)?.generation ?? -1;

    if (fatherGen >= 0 && motherGen >= 0) {
      const pathLength = fatherGen + motherGen + 1;
      inbreedingCoeff += Math.pow(0.5, pathLength);
    }
  }

  return inbreedingCoeff;
}

async function buildPedigreeLimited(
  petId: string,
  maxGenerations: number,
  exclude: Set<string>
): Promise<Map<string, AncestorNode>> {
  const pedigree = new Map<string, AncestorNode>();
  const queue: { id: string; generation: number }[] = [{ id: petId, generation: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id) || current.generation > maxGenerations || exclude.has(current.id)) continue;
    visited.add(current.id);

    const pet = await prisma.pet.findUnique({
      where: { id: current.id },
      include: {
        childRelations: {
          include: { parent: true },
        },
      },
    });

    if (!pet) continue;

    const parentIds = pet.childRelations.map((r) => r.parentId);

    pedigree.set(current.id, {
      id: current.id,
      name: pet.name,
      parents: parentIds,
      generation: current.generation,
    });

    for (const parentId of parentIds) {
      queue.push({ id: parentId, generation: current.generation + 1 });
    }
  }

  return pedigree;
}

export async function calculatePairInbreeding(maleId: string, femaleId: string): Promise<number> {
  const malePedigree = await buildPedigree(maleId, 8);
  const femalePedigree = await buildPedigree(femaleId, 8);

  const commonAncestors = findCommonAncestors(malePedigree, femalePedigree);

  if (commonAncestors.length === 0) {
    return 0;
  }

  let kinshipCoeff = 0;

  for (const ancestorId of commonAncestors) {
    const maleGen = malePedigree.get(ancestorId)?.generation ?? -1;
    const femaleGen = femalePedigree.get(ancestorId)?.generation ?? -1;

    if (maleGen >= 0 && femaleGen >= 0) {
      const pathLength = maleGen + femaleGen;
      const caInbreeding = await calculateInbreedingCoefficientRecursive(ancestorId, new Set());
      const contribution = Math.pow(0.5, pathLength) * (1 + caInbreeding);
      kinshipCoeff += contribution;
    }
  }

  return Math.round(kinshipCoeff * 10000) / 10000;
}
