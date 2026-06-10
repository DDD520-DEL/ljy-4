import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始种子数据...');

  const dogMarkers: Prisma.GeneticMarkerCreateInput[] = [
    {
      markerName: 'MDR1Δ33',
      geneName: 'ABCB1',
      chromosome: '14',
      variant: 'c.334_337delATAG',
      disease: '多药耐药性（MDR1缺陷）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: 'MDR1基因缺失突变导致对多种药物的敏感性增加，包括伊维菌素等驱虫药。',
    },
    {
      markerName: 'PRA-prcd',
      geneName: 'PRCD',
      chromosome: '9',
      variant: 'c.5G>A',
      disease: '进行性视网膜萎缩（prcd型）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: '导致视网膜进行性退化，最终导致失明。',
    },
    {
      markerName: 'DM',
      geneName: 'SOD1',
      chromosome: '31',
      variant: 'c.118G>A',
      disease: '退行性脊髓病',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'medium',
      description: '一种迟发性神经退行性疾病，影响脊髓白质。',
    },
    {
      markerName: 'vWD1',
      geneName: 'VWF',
      chromosome: '27',
      variant: 'c.2498C>T',
      disease: '血管性血友病1型',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'medium',
      description: '最常见的遗传性出血性疾病，由von Willebrand因子缺乏引起。',
    },
    {
      markerName: 'PRA_ftcd',
      geneName: 'CNGA1',
      chromosome: '3',
      variant: 'c.520delG',
      disease: '进行性视网膜萎缩（视杆细胞发育不良）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: '导致感光细胞发育异常，早期失明。',
    },
    {
      markerName: 'CCD',
      geneName: 'COL4A5',
      chromosome: 'X',
      variant: 'c.2506G>T',
      disease: '遗传性肾病（Alport综合征）',
      species: 'dog',
      inheritance: 'x_linked',
      riskLevel: 'high',
      description: 'X连锁遗传性肾病，雄性更易受影响。',
    },
    {
      markerName: 'HUU',
      geneName: 'HAO1',
      chromosome: '3',
      variant: 'c.135C>A',
      disease: '高尿酸尿症',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'medium',
      description: '导致尿酸代谢异常，易形成尿结石。',
    },
    {
      markerName: 'IC',
      geneName: 'SLC26A4',
      chromosome: '22',
      variant: 'c.1684G>A',
      disease: '先天性甲状腺功能减退症',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      riskLevel: 'medium',
      description: '甲状腺激素合成障碍，影响生长发育。',
    },
  ];

  const catMarkers: Prisma.GeneticMarkerCreateInput[] = [
    {
      markerName: 'PKD1',
      geneName: 'PKD1',
      chromosome: 'C1',
      variant: 'c.10063C>A',
      disease: '多囊肾病',
      species: 'cat',
      inheritance: 'autosomal_dominant',
      riskLevel: 'high',
      description: '常染色体显性遗传性多囊肾病，是家猫最常见的遗传性疾病之一。',
    },
    {
      markerName: 'PRA_rdAc',
      geneName: 'CEP290',
      chromosome: 'B1',
      variant: 'c.4723+1668A>G',
      disease: '进行性视网膜萎缩（rdAc型）',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: '导致视网膜感光细胞退化，最终失明。',
    },
    {
      markerName: 'HCM',
      geneName: 'MYBPC3',
      chromosome: 'A3',
      variant: 'c.91G>A',
      disease: '肥厚型心肌病',
      species: 'cat',
      inheritance: 'autosomal_dominant',
      riskLevel: 'high',
      description: '心肌异常增厚，可导致心力衰竭和猝死。',
    },
    {
      markerName: 'Glycogenosis',
      geneName: 'PYGB',
      chromosome: 'D4',
      variant: 'c.877C>T',
      disease: '糖原贮积症Ⅳ型',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: '糖原代谢障碍，导致肌肉和神经系统损伤。',
    },
    {
      markerName: 'GM1',
      geneName: 'GLB1',
      chromosome: 'E3',
      variant: 'c.422G>A',
      disease: 'GM1神经节苷脂贮积症',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      riskLevel: 'high',
      description: '溶酶体贮积病，导致神经退行性变。',
    },
    {
      markerName: 'MPS_VI',
      geneName: 'ARSB',
      chromosome: 'B3',
      variant: 'c.489G>A',
      disease: '粘多糖贮积症Ⅵ型',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      riskLevel: 'medium',
      description: '结缔组织代谢障碍，影响骨骼和关节发育。',
    },
  ];

  console.log('创建犬类遗传标记...');
  for (const marker of dogMarkers) {
    const existing = await prisma.geneticMarker.findFirst({
      where: { markerName: marker.markerName, species: marker.species },
    });
    if (!existing) {
      await prisma.geneticMarker.create({ data: marker });
    }
  }

  console.log('创建猫类遗传标记...');
  for (const marker of catMarkers) {
    const existing = await prisma.geneticMarker.findFirst({
      where: { markerName: marker.markerName, species: marker.species },
    });
    if (!existing) {
      await prisma.geneticMarker.create({ data: marker });
    }
  }

  console.log('创建示例宠物数据...');

  const petsData = [
    { name: 'Max', species: 'dog', breed: '边境牧羊犬', gender: 'male', isBreeding: true },
    { name: 'Bella', species: 'dog', breed: '边境牧羊犬', gender: 'female', isBreeding: true },
    { name: 'Charlie', species: 'dog', breed: '边境牧羊犬', gender: 'male', isBreeding: false },
    { name: 'Lucy', species: 'dog', breed: '边境牧羊犬', gender: 'female', isBreeding: false },
    { name: 'Rex', species: 'dog', breed: '德国牧羊犬', gender: 'male', isBreeding: true },
    { name: 'Daisy', species: 'dog', breed: '拉布拉多', gender: 'female', isBreeding: true },
    { name: 'Whiskers', species: 'cat', breed: '波斯猫', gender: 'male', isBreeding: true },
    { name: 'Luna', species: 'cat', breed: '布偶猫', gender: 'female', isBreeding: true },
  ];

  const pets: any[] = [];
  for (const petData of petsData) {
    const pet = await prisma.pet.create({ data: petData });
    pets.push(pet);
  }

  console.log('建立亲属关系...');

  await prisma.parentRelation.createMany({
    data: [
      { parentId: pets[0].id, childId: pets[2].id, relationType: 'father' },
      { parentId: pets[1].id, childId: pets[2].id, relationType: 'mother' },
      { parentId: pets[0].id, childId: pets[3].id, relationType: 'father' },
      { parentId: pets[1].id, childId: pets[3].id, relationType: 'mother' },
    ],
  });

  console.log('添加基因标记数据...');

  const dogMarkersFromDb = await prisma.geneticMarker.findMany({
    where: { species: 'dog' },
  });

  if (dogMarkersFromDb.length >= 2) {
    await prisma.geneMarkerData.create({
      data: {
        petId: pets[0].id,
        markerId: dogMarkersFromDb[0].id,
        genotype: 'N/N',
        zygosity: 'homozygous',
        allele1: 'N',
        allele2: 'N',
      },
    });

    await prisma.geneMarkerData.create({
      data: {
        petId: pets[1].id,
        markerId: dogMarkersFromDb[0].id,
        genotype: 'N/M',
        zygosity: 'heterozygous',
        allele1: 'N',
        allele2: 'M',
      },
    });

    await prisma.geneMarkerData.create({
      data: {
        petId: pets[0].id,
        markerId: dogMarkersFromDb[1].id,
        genotype: 'N/N',
        zygosity: 'homozygous',
        allele1: 'N',
        allele2: 'N',
      },
    });

    await prisma.geneMarkerData.create({
      data: {
        petId: pets[1].id,
        markerId: dogMarkersFromDb[1].id,
        genotype: 'N/N',
        zygosity: 'homozygous',
        allele1: 'N',
        allele2: 'N',
      },
    });
  }

  console.log('种子数据完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
