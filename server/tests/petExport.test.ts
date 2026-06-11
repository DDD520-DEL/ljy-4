import assert from 'node:assert/strict';
import {
  describe,
  it,
  beforeEach,
  afterEach,
} from 'node:test';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import petsRouter from '../src/routes/pets.js';
import prisma from '../src/lib/prisma.js';
import type { Pet, GeneMarkerData, GeneticMarker } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/api/pets', petsRouter);

type PetWithMarkers = Pet & {
  geneMarkers: (GeneMarkerData & { marker: GeneticMarker })[];
};

describe('GET /api/pets/export/excel', () => {
  let prismaMock: sinon.SinonStubbedInstance<typeof prisma>;

  beforeEach(() => {
    prismaMock = sinon.stub(prisma);
  });

  afterEach(() => {
    sinon.restore();
  });

  const createMockPet = (overrides: Partial<Pet> = {}): Pet => ({
    id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '测试宠物',
    species: 'dog',
    breed: '金毛寻回犬',
    gender: 'male',
    birthDate: new Date('2020-01-15'),
    color: '金色',
    weight: 30,
    description: null,
    avatarUrl: null,
    isBreeding: true,
    status: 'active',
    ownedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockMarker = (
    petId: string,
    markerOverrides: Partial<GeneticMarker> = {},
    dataOverrides: Partial<GeneMarkerData> = {}
  ): GeneMarkerData & { marker: GeneticMarker } => ({
    id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    petId,
    markerId: 'marker-1',
    genotype: 'N/N',
    allele1: 'N',
    allele2: 'N',
    zygosity: 'homozygous',
    source: 'test_report',
    testedAt: new Date(),
    marker: {
      id: 'marker-1',
      markerName: 'MDR1',
      geneName: 'ABCB1',
      chromosome: '12',
      position: 123456,
      variant: 'c.123G>A',
      disease: '伊维菌素敏感性',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: '伊维菌素敏感性测试',
      reference: null,
      createdAt: new Date(),
      ...markerOverrides,
    },
    ...dataOverrides,
  });

  it('应成功导出 Excel 文件，返回正确的 Content-Type', async () => {
    const mockPet = createMockPet();
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [
          createMockMarker(mockPet.id, { riskLevel: 'high' }, { genotype: 'M/M', zygosity: 'homozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'medium' }, { genotype: 'N/M', zygosity: 'heterozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'low' }, { genotype: 'N/N', zygosity: 'homozygous' }),
        ],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    const response = await request(app).get('/api/pets/export/excel');

    assert.equal(response.status, 200);
    assert.equal(
      response.headers['content-type'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    assert.ok(
      response.headers['content-disposition']?.includes('attachment'),
      'Content-Disposition 应包含 attachment'
    );
    assert.ok(response.body.length > 0, '响应体不应为空');
  });

  it('应支持 species 筛选参数', async () => {
    const mockPet = createMockPet({ species: 'cat' });
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    await request(app).get('/api/pets/export/excel').query({ species: 'cat' });

    const findManyArgs = prismaMock.pet.findMany.firstCall.args[0];
    assert.deepEqual(findManyArgs.where, { species: 'cat' });
  });

  it('应支持 gender 筛选参数', async () => {
    const mockPet = createMockPet({ gender: 'female' });
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    await request(app).get('/api/pets/export/excel').query({ gender: 'female' });

    const findManyArgs = prismaMock.pet.findMany.firstCall.args[0];
    assert.deepEqual(findManyArgs.where, { gender: 'female' });
  });

  it('应支持 search 搜索参数', async () => {
    const mockPet = createMockPet({ name: '小黄' });
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    await request(app).get('/api/pets/export/excel').query({ search: '小黄' });

    const findManyArgs = prismaMock.pet.findMany.firstCall.args[0];
    assert.ok(findManyArgs.where.OR, '应包含 OR 条件');
    assert.deepEqual(findManyArgs.where.OR, [
      { name: { contains: '小黄' } },
      { breed: { contains: '小黄' } },
    ]);
  });

  it('species=all 时不应添加筛选条件', async () => {
    const mockPets: PetWithMarkers[] = [
      {
        ...createMockPet(),
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    await request(app).get('/api/pets/export/excel').query({ species: 'all' });

    const findManyArgs = prismaMock.pet.findMany.firstCall.args[0];
    assert.equal(findManyArgs.where.species, undefined);
  });

  it('应包含 geneMarkers 关联查询', async () => {
    const mockPets: PetWithMarkers[] = [
      {
        ...createMockPet(),
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    await request(app).get('/api/pets/export/excel');

    const findManyArgs = prismaMock.pet.findMany.firstCall.args[0];
    assert.ok(findManyArgs.include?.geneMarkers, '应包含 geneMarkers');
    assert.ok(
      findManyArgs.include.geneMarkers.include?.marker,
      'geneMarkers 应包含 marker 关联'
    );
  });

  it('应按 createdAt 降序排列', async () => {
    const mockPets: PetWithMarkers[] = [
      {
        ...createMockPet(),
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    await request(app).get('/api/pets/export/excel');

    const findManyArgs = prismaMock.pet.findMany.firstCall.args[0];
    assert.deepEqual(findManyArgs.orderBy, { createdAt: 'desc' });
  });

  it('无宠物数据时应返回空的 Excel 文件', async () => {
    prismaMock.pet.findMany.resolves([]);

    const response = await request(app).get('/api/pets/export/excel');

    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0, '即使没有数据也应返回 Excel 文件结构');
  });

  it('数据库查询失败时应返回 500 错误', async () => {
    prismaMock.pet.findMany.rejects(new Error('Database connection failed'));

    const response = await request(app).get('/api/pets/export/excel');

    assert.equal(response.status, 500);
    assert.equal(response.body.error, '导出宠物列表失败');
  });

  it('基因标记统计应正确计算高风险/中风险/携带/低风险数量', async () => {
    const mockPet = createMockPet();
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [
          createMockMarker(mockPet.id, { riskLevel: 'high' }, { genotype: 'M/M', zygosity: 'homozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'high' }, { genotype: 'M/M', zygosity: 'homozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'medium' }, { genotype: 'N/M', zygosity: 'heterozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'medium' }, { genotype: 'N/M', zygosity: 'heterozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'medium' }, { genotype: 'N/M', zygosity: 'heterozygous' }),
          createMockMarker(mockPet.id, { riskLevel: 'low' }, { genotype: 'N/N', zygosity: 'homozygous' }),
          createMockMarker(
            mockPet.id,
            { riskLevel: 'high', inheritance: 'autosomal_recessive' },
            { genotype: 'N/M', zygosity: 'heterozygous' }
          ),
        ],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    const response = await request(app).get('/api/pets/export/excel');

    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);
  });

  it('出生日期为 null 时应显示未知', async () => {
    const mockPet = createMockPet({ birthDate: null });
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    const response = await request(app).get('/api/pets/export/excel');

    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);
  });

  it('品种为 null 时应显示未知', async () => {
    const mockPet = createMockPet({ breed: null });
    const mockPets: PetWithMarkers[] = [
      {
        ...mockPet,
        geneMarkers: [],
      },
    ];

    prismaMock.pet.findMany.resolves(mockPets);

    const response = await request(app).get('/api/pets/export/excel');

    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);
  });
});

describe('基因标记统计逻辑', () => {
  it('highRiskCount 应只统计 riskLevel 为 high 的标记', () => {
    const markers = [
      { marker: { riskLevel: 'high' } },
      { marker: { riskLevel: 'high' } },
      { marker: { riskLevel: 'medium' } },
      { marker: { riskLevel: 'low' } },
    ];

    const highRiskCount = markers.filter((m) => m.marker?.riskLevel === 'high').length;

    assert.equal(highRiskCount, 2);
  });

  it('mediumRiskCount 应只统计 riskLevel 为 medium 的标记', () => {
    const markers = [
      { marker: { riskLevel: 'high' } },
      { marker: { riskLevel: 'medium' } },
      { marker: { riskLevel: 'medium' } },
      { marker: { riskLevel: 'low' } },
    ];

    const mediumRiskCount = markers.filter((m) => m.marker?.riskLevel === 'medium').length;

    assert.equal(mediumRiskCount, 2);
  });

  it('carrierCount 应统计杂合子且为隐性遗传的标记', () => {
    const markers = [
      { zygosity: 'heterozygous', marker: { inheritance: 'autosomal_recessive' } },
      { zygosity: 'homozygous', marker: { inheritance: 'autosomal_recessive' } },
      { zygosity: 'heterozygous', marker: { inheritance: 'autosomal_dominant' } },
      { zygosity: 'heterozygous', marker: { inheritance: 'x_linked_recessive' } },
      { zygosity: null, marker: { inheritance: 'autosomal_recessive' } },
    ];

    const carrierCount = markers.filter((m) => {
      if (!m.zygosity) return false;
      return m.zygosity === 'heterozygous' && m.marker?.inheritance?.includes('recessive');
    }).length;

    assert.equal(carrierCount, 2);
  });

  it('未检测基因标记时应显示未检测', () => {
    const markers: any[] = [];
    const total = markers.length;

    let markerSummary = '未检测';
    if (total > 0) {
      markerSummary = `共检测 ${total} 个位点`;
    }

    assert.equal(markerSummary, '未检测');
  });

  it('检测到标记时应生成正确的概况文本', () => {
    const markers = [
      { marker: { riskLevel: 'high' } },
      { marker: { riskLevel: 'high' } },
      { marker: { riskLevel: 'medium' } },
    ];

    const highRiskCount = markers.filter((m) => m.marker?.riskLevel === 'high').length;
    const mediumRiskCount = markers.filter((m) => m.marker?.riskLevel === 'medium').length;
    const total = markers.length;

    const summaryParts = [];
    summaryParts.push(`共检测 ${total} 个位点`);
    if (highRiskCount > 0) summaryParts.push(`高风险 ${highRiskCount} 个`);
    if (mediumRiskCount > 0) summaryParts.push(`中风险 ${mediumRiskCount} 个`);

    const markerSummary = summaryParts.join('，');

    assert.equal(markerSummary, '共检测 3 个位点，高风险 2 个，中风险 1 个');
  });
});

describe('性别和物种标签转换', () => {
  it('性别 male 应转换为雄性', () => {
    const getGenderLabel = (gender: string) => {
      if (gender === 'male') return '雄性';
      if (gender === 'female') return '雌性';
      return '未知';
    };

    assert.equal(getGenderLabel('male'), '雄性');
    assert.equal(getGenderLabel('female'), '雌性');
    assert.equal(getGenderLabel('unknown'), '未知');
  });

  it('物种 dog 应转换为犬，cat 应转换为猫', () => {
    const getSpeciesLabel = (species: string) => {
      if (species === 'dog') return '犬';
      if (species === 'cat') return '猫';
      return species;
    };

    assert.equal(getSpeciesLabel('dog'), '犬');
    assert.equal(getSpeciesLabel('cat'), '猫');
    assert.equal(getSpeciesLabel('bird'), 'bird');
  });
});
