import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error.response?.data || error.message);
  }
);

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string;
  birthDate: string | null;
  color: string | null;
  weight: number | null;
  description: string | null;
  avatarUrl: string | null;
  isBreeding: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  childRelations?: ParentRelation[];
  parentRelations?: ParentRelation[];
  geneReports?: GeneReport[];
  geneMarkers?: GeneMarkerData[];
}

export interface ParentRelation {
  id: string;
  parentId: string;
  childId: string;
  relationType: string;
  parent?: Pet;
  child?: Pet;
}

export interface GeneReport {
  id: string;
  petId: string;
  reportType: string;
  fileName: string;
  fileUrl: string | null;
  parsedData?: any;
  status: string;
  uploadedAt: string;
  parsedAt: string | null;
}

export interface GeneticMarker {
  id: string;
  markerName: string;
  geneName: string;
  chromosome: string | null;
  position: number | null;
  variant: string;
  disease: string;
  species: string;
  inheritance: string;
  riskLevel: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
}

export interface GeneMarkerData {
  id: string;
  petId: string;
  markerId: string;
  genotype: string;
  allele1: string | null;
  allele2: string | null;
  zygosity: string | null;
  source: string | null;
  testedAt: string | null;
  marker?: GeneticMarker;
}

export interface PedigreeNode {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string;
  generation: number;
  isBreeding: boolean;
  avatarUrl: string | null;
  father: PedigreeNode | null;
  mother: PedigreeNode | null;
}

export interface RiskResult {
  markerName: string;
  geneName: string;
  disease: string;
  inheritance: string;
  genotype: string;
  zygosity: string | null;
  riskScore: number;
  riskLevel: string;
  explanation: string;
}

export interface RiskSummary {
  overallRisk: string;
  summary: {
    total: number;
    tested: number;
    highRisk: number;
    mediumRisk: number;
    carrier: number;
    lowRisk: number;
  };
  markers: RiskResult[];
}

export interface OffspringRisk {
  overallRisk: string;
  overallRiskScore: number;
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
  summary: {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    carrier: number;
    unknown: number;
  };
}

export interface InbreedingResult {
  petId: string;
  petName: string;
  inbreedingCoefficient: number;
  percentage: string;
  riskLevel: string;
  interpretation: string;
}

export interface PairInbreedingResult {
  male: { id: string; name: string; breed: string | null };
  female: { id: string; name: string; breed: string | null };
  kinshipCoefficient: number;
  offspringInbreedingCoefficient: number;
  percentage: string;
  inbreedingRiskLevel: string;
  inbreedingInterpretation: string;
  geneticRisk: {
    overall: string;
    overallRiskScore: number;
    summary: any;
  };
}

export interface BreedingPair {
  id: string;
  maleId: string;
  femaleId: string;
  name: string | null;
  notes: string | null;
  inbreedingCoefficient: number | null;
  riskAssessment: any;
  status: string;
  createdAt: string;
  male?: Pet;
  female?: Pet;
}

export interface BreedingRecommendation {
  id: string;
  male: {
    id: string;
    name: string;
    breed: string | null;
    species: string;
    avatarUrl: string | null;
  };
  female: {
    id: string;
    name: string;
    breed: string | null;
    species: string;
    avatarUrl: string | null;
  };
  species: string;
  inbreedingCoefficient: number;
  inbreedingRiskLevel: string;
  overallGeneticRiskScore: number;
  overallGeneticRiskLevel: string;
  combinedRiskScore: number;
  overallRiskLevel: string;
  riskSummary: {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    carrier: number;
    unknown: number;
  };
  topRisks: {
    markerName: string;
    disease: string;
    inheritance: string;
    parent1Genotype: string;
    parent2Genotype: string;
    offspringRisk: number;
    offspringRiskLevel: string;
    explanation: string;
  }[];
}

export interface WeightRecord {
  id: string;
  petId: string;
  weight: number;
  recordedAt: string;
  note: string | null;
  createdAt: string;
}

export type TimelineEventType = 'weight' | 'gene' | 'breeding';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  summary: string;
  detail: any;
  link: string;
}

export interface WeightTrendPoint {
  date: string;
  weight: number;
}

export interface TimelineStats {
  totalWeightRecords: number;
  totalGeneReports: number;
  totalBreedingRecords: number;
}

export interface TimelineResponse {
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    gender: string;
  };
  weightTrend: WeightTrendPoint[];
  stats: TimelineStats;
  events: TimelineEvent[];
}

export interface BreedingRecommendationsResponse {
  total: number;
  limit: number;
  recommendations: BreedingRecommendation[];
}

export interface PuppyRecord {
  id: string;
  litterRecordId: string;
  petId: string | null;
  name: string | null;
  gender: string;
  birthWeight: number | null;
  color: string | null;
  status: string;
  healthStatus: string;
  healthNotes: string | null;
  createdAt: string;
  updatedAt: string;
  pet?: Pet | null;
}

export interface PuppyRecordInput {
  name?: string;
  gender: string;
  birthWeight?: number;
  color?: string;
  status?: string;
  healthStatus?: string;
  healthNotes?: string;
}

export interface HealthComparison {
  predictedRisks?: string[];
  actualHealthIssues?: string[];
  matchLevel?: string;
  notes?: string;
}

export interface LitterRecord {
  id: string;
  breedingPairId: string;
  birthDate: string;
  totalCount: number;
  aliveCount: number;
  deadCount: number;
  notes: string | null;
  healthComparison: HealthComparison | null;
  createdAt: string;
  updatedAt: string;
  breedingPair?: BreedingPair;
  puppies?: PuppyRecord[];
}

export interface LitterRecordInput {
  birthDate: string;
  totalCount: number;
  aliveCount?: number;
  deadCount?: number;
  notes?: string;
  puppies?: PuppyRecordInput[];
  healthComparison?: HealthComparison;
}

export interface SearchResultPet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  avatarUrl: string | null;
}

export interface SearchResultGeneMarker {
  id: string;
  markerName: string;
  geneName: string;
  disease: string;
  species: string;
}

export interface SearchResultBreedingPair {
  id: string;
  name: string | null;
  male: { id: string; name: string; breed: string | null };
  female: { id: string; name: string; breed: string | null };
}

export interface SearchResponse {
  pets: SearchResultPet[];
  breeds: SearchResultPet[];
  geneMarkers: SearchResultGeneMarker[];
  diseases: SearchResultGeneMarker[];
  breedingPairs: SearchResultBreedingPair[];
}

export interface BreedDistributionItem {
  species: string;
  breed: string;
  count: number;
}

export interface MarkerCarrierRateItem {
  markerId: string;
  markerName: string;
  geneName: string;
  disease: string;
  species: string;
  inheritance: string;
  riskLevel: string;
  totalInSpecies: number;
  testedCount: number;
  carrierCount: number;
  affectedCount: number;
  clearCount: number;
  carrierRate: number;
  affectedRate: number;
  detectionRate: number;
}

export interface InbreedingDistribution {
  totalPets: number;
  petsWithBothParents: number;
  averageCoefficient: number;
  maxCoefficient: number;
  distribution: {
    low: number;
    medium: number;
    high: number;
    very_high: number;
    unknown: number;
  };
  buckets: { range: string; count: number }[];
  details: {
    petId: string;
    petName: string;
    species: string;
    breed: string | null;
    inbreedingCoefficient: number;
    riskLevel: string;
  }[];
}

export interface DiseaseFrequencyItem {
  disease: string;
  species: string;
  inheritance: string;
  testedCount: number;
  affectedCount: number;
  carrierCount: number;
  clearCount: number;
  totalInSpecies: number;
  detectionFrequency: number;
  carrierFrequency: number;
}

export interface DashboardStats {
  breedDistribution: BreedDistributionItem[];
  markerCarrierRates: MarkerCarrierRateItem[];
  inbreedingDistribution: InbreedingDistribution;
  diseaseFrequencies: DiseaseFrequencyItem[];
}

export const petApi = {
  list: (params?: Record<string, any>) => api.get<any, Pet[]>('/pets', { params }),
  get: (id: string) => api.get<any, Pet>(`/pets/${id}`),
  create: (data: Partial<Pet>) => api.post<any, Pet>('/pets', data),
  update: (id: string, data: Partial<Pet>) => api.put<any, Pet>(`/pets/${id}`, data),
  remove: (id: string) => api.delete<any, { message: string }>(`/pets/${id}`),
  pedigree: (id: string, generations = 5) =>
    api.get<any, PedigreeNode>(`/pets/${id}/pedigree`, { params: { generations } }),
  timeline: (id: string) => api.get<any, TimelineResponse>(`/pets/${id}/timeline`),
  listWeights: (id: string) => api.get<any, WeightRecord[]>(`/pets/${id}/weights`),
  createWeight: (id: string, data: Partial<WeightRecord>) =>
    api.post<any, WeightRecord>(`/pets/${id}/weights`, data),
  updateWeight: (id: string, recordId: string, data: Partial<WeightRecord>) =>
    api.put<any, WeightRecord>(`/pets/${id}/weights/${recordId}`, data),
  removeWeight: (id: string, recordId: string) =>
    api.delete<any, { message: string }>(`/pets/${id}/weights/${recordId}`),
};

export const relationApi = {
  create: (data: { parentId: string; childId: string; relationType: string }) =>
    api.post<any, ParentRelation>('/relations', data),
  remove: (id: string) => api.delete<any, { message: string }>(`/relations/${id}`),
  listByPet: (petId: string) => api.get<any, ParentRelation[]>(`/relations/pet/${petId}`),
  batchCreate: (relations: any[]) => api.post<any, any[]>('/relations/batch', { relations }),
};

export const geneReportApi = {
  listByPet: (petId: string) => api.get<any, GeneReport[]>(`/gene-reports/pet/${petId}`),
  get: (id: string) => api.get<any, GeneReport>(`/gene-reports/${id}`),
  upload: (petId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<any, any>(`/gene-reports/upload/${petId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createMock: (petId: string) => api.post<any, GeneReport>(`/gene-reports/mock/${petId}`),
  remove: (id: string) => api.delete<any, { message: string }>(`/gene-reports/${id}`),
  batchExport: async (reportIds: string[]) => {
    const response = await axios.post('/api/gene-reports/batch-export', { reportIds }, {
      responseType: 'blob',
      timeout: 120000,
    });
    return response;
  },
};

export const geneticsApi = {
  listMarkers: (species?: string) =>
    api.get<any, GeneticMarker[]>('/genetics/markers', { params: { species } }),
  getMarker: (id: string) => api.get<any, GeneticMarker>(`/genetics/markers/${id}`),
  getPetMarkers: (petId: string) => api.get<any, any[]>(`/genetics/pet/${petId}/markers`),
  getPetRisk: (petId: string) => api.get<any, RiskSummary>(`/genetics/pet/${petId}/risk`),
  getOffspringRisk: (parent1Id: string, parent2Id: string) =>
    api.get<any, OffspringRisk>('/genetics/offspring/risk', {
      params: { parent1Id, parent2Id },
    }),
};

export const breedingApi = {
  listBreedingPets: (params?: Record<string, any>) =>
    api.get<any, Pet[]>('/breeding/breeding-pets', { params }),
  getInbreeding: (petId: string) =>
    api.get<any, InbreedingResult>(`/breeding/inbreeding/${petId}`),
  getPairInbreeding: (maleId: string, femaleId: string) =>
    api.post<any, PairInbreedingResult>('/breeding/pair/inbreeding', { maleId, femaleId }),
  listPairs: () => api.get<any, BreedingPair[]>('/breeding/breeding-pairs'),
  getPair: (id: string) => api.get<any, BreedingPair>(`/breeding/breeding-pairs/${id}`),
  createPair: (data: any) => api.post<any, BreedingPair>('/breeding/breeding-pairs', data),
  removePair: (id: string) => api.delete<any, { message: string }>(`/breeding/breeding-pairs/${id}`),
  getRecommendations: (params?: { species?: string; maxInbreedingCoeff?: number; limit?: number }) =>
    api.get<any, BreedingRecommendationsResponse>('/breeding/recommendations', { params }),
  listLitters: (pairId: string) =>
    api.get<any, LitterRecord[]>(`/breeding/breeding-pairs/${pairId}/litters`),
  getLitter: (id: string) =>
    api.get<any, LitterRecord>(`/breeding/litters/${id}`),
  createLitter: (pairId: string, data: LitterRecordInput) =>
    api.post<any, LitterRecord>(`/breeding/breeding-pairs/${pairId}/litters`, data),
  updateLitter: (id: string, data: Partial<LitterRecordInput>) =>
    api.put<any, LitterRecord>(`/breeding/litters/${id}`, data),
  removeLitter: (id: string) =>
    api.delete<any, { message: string }>(`/breeding/litters/${id}`),
  updatePuppy: (id: string, data: Partial<PuppyRecordInput>) =>
    api.put<any, PuppyRecord>(`/breeding/puppies/${id}`, data),
};

export const searchApi = {
  search: (query: string) =>
    api.get<any, SearchResponse>('/search', { params: { q: query } }),
};

export const dashboardApi = {
  getStats: () =>
    api.get<any, DashboardStats>('/dashboard/stats'),
};

export default api;
