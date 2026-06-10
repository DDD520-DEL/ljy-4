export interface MarkerDatum {
  petId: string;
  genotype: string;
  zygosity: string | null;
}

export interface DiseaseAggregationItem {
  disease: string;
  species: string;
  inheritance: string;
  testedCount: number;
  affectedCount: number;
  carrierCount: number;
  clearCount: number;
}

export interface MarkerWithDisease extends MarkerDatum {
  marker: {
    markerName: string;
    disease: string;
    species: string;
    inheritance: string;
  };
}

export function isAffectedGenotype(genotype: string, zygosity: string | null): boolean {
  return (
    zygosity === 'homozygous' ||
    genotype === 'M/M' ||
    genotype === 'm/m'
  );
}

export function isCarrierGenotype(genotype: string, zygosity: string | null): boolean {
  return (
    zygosity === 'heterozygous' ||
    genotype === 'N/M' ||
    genotype === 'N/m'
  );
}

export function isClearGenotype(genotype: string, zygosity: string | null): boolean {
  return (
    (zygosity === null || zygosity === undefined) && genotype === 'N/N'
  );
}

export function determineMarkerStatus(
  genotype: string,
  zygosity: string | null
): 'affected' | 'carrier' | 'clear' | null {
  if (isAffectedGenotype(genotype, zygosity)) return 'affected';
  if (isCarrierGenotype(genotype, zygosity)) return 'carrier';
  if (isClearGenotype(genotype, zygosity)) return 'clear';
  return null;
}

const STATUS_PRIORITY: Record<string, number> = {
  affected: 3,
  carrier: 2,
  clear: 1,
};

export function mergeStatus(
  current: 'affected' | 'carrier' | 'clear' | undefined,
  next: 'affected' | 'carrier' | 'clear' | null
): 'affected' | 'carrier' | 'clear' | null {
  if (!next) return current || null;
  if (!current) return next;

  const currentPriority = STATUS_PRIORITY[current] || 0;
  const nextPriority = STATUS_PRIORITY[next] || 0;

  return nextPriority > currentPriority ? next : current;
}

export function aggregateDiseaseByPet(
  markerData: MarkerWithDisease[]
): DiseaseAggregationItem[] {
  const diseasePetMap = new Map<string, {
    disease: string;
    species: string;
    inheritance: string;
    pets: Map<string, 'affected' | 'carrier' | 'clear'>;
  }>();

  for (const md of markerData) {
    const key = `${md.marker.disease}|${md.marker.species}`;
    if (!diseasePetMap.has(key)) {
      diseasePetMap.set(key, {
        disease: md.marker.disease,
        species: md.marker.species,
        inheritance: md.marker.inheritance,
        pets: new Map(),
      });
    }
    const entry = diseasePetMap.get(key)!;

    const markerStatus = determineMarkerStatus(md.genotype, md.zygosity);
    const currentStatus = entry.pets.get(md.petId);
    const mergedStatus = mergeStatus(currentStatus, markerStatus);

    if (mergedStatus) {
      entry.pets.set(md.petId, mergedStatus);
    }
  }

  return Array.from(diseasePetMap.values()).map((d) => {
    const petStatuses = Array.from(d.pets.values());
    return {
      disease: d.disease,
      species: d.species,
      inheritance: d.inheritance,
      testedCount: petStatuses.length,
      affectedCount: petStatuses.filter((s) => s === 'affected').length,
      carrierCount: petStatuses.filter((s) => s === 'carrier').length,
      clearCount: petStatuses.filter((s) => s === 'clear').length,
    };
  }).sort((a, b) => b.affectedCount - a.affectedCount);
}
