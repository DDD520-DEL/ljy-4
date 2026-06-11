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

  console.log('创建品种数据...');

  const breedsData: Prisma.BreedCreateInput[] = [
    {
      name: '边境牧羊犬',
      species: 'dog',
      origin: '英国苏格兰边境',
      avgLifespan: '12-15年',
      commonDiseases: JSON.stringify([
        '进行性视网膜萎缩（PRA）',
        '髋关节发育不良',
        '癫痫',
        '柯利眼畸形',
        '遗传性肾病',
      ]),
      carePoints: JSON.stringify([
        '每天需要大量运动和智力刺激',
        '定期梳理毛发，尤其是换毛期',
        '提供益智玩具和训练活动',
        '定期进行眼科检查',
        '注意髋关节健康，避免过度跳跃',
      ]),
      description: '边境牧羊犬是一种非常聪明、敏捷的工作犬，以其出色的牧羊能力和高智商著称。它们性格温顺、服从性强，是优秀的家庭伴侣和工作犬。',
      sizeCategory: 'medium',
      temperament: '聪明、活泼、忠诚、机警',
    },
    {
      name: '金毛寻回犬',
      species: 'dog',
      origin: '苏格兰',
      avgLifespan: '10-12年',
      commonDiseases: JSON.stringify([
        '髋关节发育不良',
        '肘关节发育不良',
        '进行性视网膜萎缩',
        '心脏病（主动脉瓣下狭窄）',
        '癌症（血管肉瘤、淋巴瘤）',
      ]),
      carePoints: JSON.stringify([
        '每天保持适量运动，避免肥胖',
        '定期梳理浓密的被毛',
        '注意饮食控制，防止过度进食',
        '定期进行心脏和关节检查',
        '提供充足的社交互动和陪伴',
      ]),
      description: '金毛寻回犬是一种友善、聪明、易于训练的大型犬种。它们性格温和，对人类充满热情，是非常受欢迎的家庭宠物和工作犬。',
      sizeCategory: 'large',
      temperament: '友善、温顺、聪明、忠诚',
    },
    {
      name: '拉布拉多',
      species: 'dog',
      origin: '加拿大纽芬兰',
      avgLifespan: '10-12年',
      commonDiseases: JSON.stringify([
        '髋关节发育不良',
        '肘关节发育不良',
        '进行性视网膜萎缩',
        '肥胖症',
        '心脏病',
      ]),
      carePoints: JSON.stringify([
        '严格控制饮食，防止肥胖',
        '每天保证充足的运动',
        '定期梳理短毛',
        '注意耳朵清洁，预防耳炎',
        '定期进行关节和眼睛检查',
      ]),
      description: '拉布拉多寻回犬是一种性格温和、智商很高的犬种，广泛用于导盲犬、搜救犬等工作犬领域。它们友善、活泼，是优秀的家庭伴侣。',
      sizeCategory: 'large',
      temperament: '温和、活泼、聪明、友善',
    },
    {
      name: '德国牧羊犬',
      species: 'dog',
      origin: '德国',
      avgLifespan: '9-13年',
      commonDiseases: JSON.stringify([
        '髋关节发育不良',
        '肘关节发育不良',
        '退行性脊髓病（DM）',
        '胰腺炎',
        '心脏病',
      ]),
      carePoints: JSON.stringify([
        '需要大量运动和训练',
        '定期梳理双层被毛',
        '注意关节保护，避免上下楼梯过多',
        '提供社会化训练',
        '定期进行神经和关节检查',
      ]),
      description: '德国牧羊犬是一种聪明、勇敢、忠诚的大型工作犬，广泛用于警犬、军犬、搜救犬等领域。它们体格强壮，工作能力强。',
      sizeCategory: 'large',
      temperament: '勇敢、聪明、忠诚、机警',
    },
    {
      name: '柯基',
      species: 'dog',
      origin: '英国威尔士',
      avgLifespan: '12-15年',
      commonDiseases: JSON.stringify([
        '髋关节发育不良',
        '退行性椎间盘疾病',
        '进行性视网膜萎缩',
        '肥胖症',
        '犬类血管性血友病',
      ]),
      carePoints: JSON.stringify([
        '严格控制体重，减轻脊椎负担',
        '避免剧烈跳跃和上下楼梯',
        '每天适量运动',
        '定期梳理双层被毛',
        '注意脊椎健康检查',
      ]),
      description: '威尔士柯基犬是一种短腿长身的小型牧羊犬，性格活泼、聪明、忠诚。它们虽然体型小，但非常勇敢和机敏。',
      sizeCategory: 'small',
      temperament: '活泼、聪明、勇敢、友好',
    },
    {
      name: '柴犬',
      species: 'dog',
      origin: '日本',
      avgLifespan: '12-15年',
      commonDiseases: JSON.stringify([
        '髋关节发育不良',
        '髌骨脱位',
        '过敏性皮炎',
        '甲状腺功能减退',
        '进行性视网膜萎缩',
      ]),
      carePoints: JSON.stringify([
        '每天适量运动，保持活力',
        '定期梳理浓密被毛',
        '注意皮肤过敏问题',
        '提供社会化训练',
        '定期进行甲状腺功能检查',
      ]),
      description: '柴犬是日本的古老犬种，性格独立、机警、忠诚。它们有着独特的狐狸般的面容和卷曲的尾巴，是非常受欢迎的伴侣犬。',
      sizeCategory: 'medium',
      temperament: '独立、机警、忠诚、干净',
    },
    {
      name: '哈士奇',
      species: 'dog',
      origin: '西伯利亚',
      avgLifespan: '12-15年',
      commonDiseases: JSON.stringify([
        '髋关节发育不良',
        '进行性视网膜萎缩',
        '白内障',
        '锌反应性皮肤病',
        '甲状腺功能减退',
      ]),
      carePoints: JSON.stringify([
        '需要大量运动和活动空间',
        '定期梳理浓密的双层被毛',
        '注意眼睛健康检查',
        '提供充足的社交互动',
        '注意锌元素的摄入',
      ]),
      description: '西伯利亚哈士奇是一种古老的雪橇犬，以其蓝色或多色的眼睛和浓密的被毛著称。它们性格友善、活泼，需要大量运动。',
      sizeCategory: 'medium',
      temperament: '友善、活泼、顽皮、独立',
    },
    {
      name: '比熊',
      species: 'dog',
      origin: '地中海地区',
      avgLifespan: '12-15年',
      commonDiseases: JSON.stringify([
        '白内障',
        '髌骨脱位',
        '过敏',
        '牙齿问题',
        '膀胱结石',
      ]),
      carePoints: JSON.stringify([
        '定期美容和梳理，防止毛发打结',
        '注意口腔卫生，定期刷牙',
        '每天适量运动',
        '注意皮肤过敏问题',
        '定期进行眼睛检查',
      ]),
      description: '比熊犬是一种小型伴侣犬，以其蓬松的白色被毛和活泼开朗的性格著称。它们性格温顺、友善，非常适合家庭饲养。',
      sizeCategory: 'small',
      temperament: '活泼、开朗、温顺、粘人',
    },
    {
      name: '英短',
      species: 'cat',
      origin: '英国',
      avgLifespan: '12-17年',
      commonDiseases: JSON.stringify([
        '肥厚型心肌病（HCM）',
        '多囊肾病（PKD）',
        '肥胖症',
        '糖尿病',
        '尿结石',
      ]),
      carePoints: JSON.stringify([
        '控制饮食，防止肥胖',
        '定期梳理短毛',
        '提供足够的运动和玩耍',
        '定期进行心脏超声检查',
        '注意泌尿系统健康',
      ]),
      description: '英国短毛猫是一种体型圆胖、被毛短密的猫种。它们性格温和、独立，适应能力强，是非常受欢迎的家庭伴侣猫。',
      sizeCategory: 'medium',
      temperament: '温和、独立、安静、友善',
    },
    {
      name: '美短',
      species: 'cat',
      origin: '美国',
      avgLifespan: '15-20年',
      commonDiseases: JSON.stringify([
        '肥厚型心肌病（HCM）',
        '进行性视网膜萎缩（PRA）',
        '肥胖症',
        '糖尿病',
        '关节炎',
      ]),
      carePoints: JSON.stringify([
        '均衡饮食，控制体重',
        '定期梳理被毛',
        '提供充足的运动和玩具',
        '定期进行心脏和眼睛检查',
        '注意老年猫的关节健康',
      ]),
      description: '美国短毛猫是一种强壮、活泼的短毛猫种。它们性格温和、聪明，适应能力强，寿命较长，是优秀的家庭伴侣。',
      sizeCategory: 'medium',
      temperament: '活泼、聪明、温和、好奇',
    },
    {
      name: '布偶猫',
      species: 'cat',
      origin: '美国加州',
      avgLifespan: '12-17年',
      commonDiseases: JSON.stringify([
        '肥厚型心肌病（HCM）',
        '多囊肾病（PKD）',
        '肥胖症',
        '心脏病',
        '泌尿系统疾病',
      ]),
      carePoints: JSON.stringify([
        '定期梳理长毛，防止打结',
        '控制饮食，避免肥胖',
        '提供安静舒适的环境',
        '定期进行心脏检查',
        '注意泌尿系统健康',
      ]),
      description: '布偶猫是一种大型长毛猫，以其温顺的性格和蓝色的眼睛著称。它们性格温和、粘人，像布偶一样被抱着也很放松。',
      sizeCategory: 'large',
      temperament: '温顺、粘人、安静、友善',
    },
    {
      name: '波斯猫',
      species: 'cat',
      origin: '波斯（今伊朗）',
      avgLifespan: '12-17年',
      commonDiseases: JSON.stringify([
        '多囊肾病（PKD）',
        '进行性视网膜萎缩（PRA）',
        '肥厚型心肌病（HCM）',
        '呼吸系统问题',
        '皮肤病',
      ]),
      carePoints: JSON.stringify([
        '每天梳理长毛，防止打结',
        '注意面部清洁，护理泪腺',
        '定期进行肾脏和眼睛检查',
        '保持室内空气流通',
        '提供低压力的生活环境',
      ]),
      description: '波斯猫是最古老的猫种之一，以其长而浓密的被毛和扁平的面部特征著称。它们性格安静、温和，是优雅的伴侣猫。',
      sizeCategory: 'medium',
      temperament: '安静、温和、优雅、独立',
    },
    {
      name: '暹罗猫',
      species: 'cat',
      origin: '泰国（旧称暹罗）',
      avgLifespan: '12-20年',
      commonDiseases: JSON.stringify([
        '进行性视网膜萎缩（PRA）',
        '青光眼',
        '肥厚型心肌病（HCM）',
        '哮喘',
        '牙齿问题',
      ]),
      carePoints: JSON.stringify([
        '提供充足的互动和玩耍时间',
        '定期梳理短毛',
        '注意眼睛健康检查',
        '保持室内温暖',
        '提供丰富的环境刺激',
      ]),
      description: '暹罗猫是一种古老的短毛猫种，以其蓝色的杏仁眼和重点色被毛著称。它们性格活泼、好动、爱叫，非常聪明和粘人。',
      sizeCategory: 'medium',
      temperament: '活泼、好动、聪明、粘人',
    },
    {
      name: '缅因猫',
      species: 'cat',
      origin: '美国缅因州',
      avgLifespan: '10-13年',
      commonDiseases: JSON.stringify([
        '肥厚型心肌病（HCM）',
        '髋关节发育不良',
        '脊髓性肌肉萎缩（SMA）',
        '多囊肾病（PKD）',
        '肥胖症',
      ]),
      carePoints: JSON.stringify([
        '定期梳理半长毛',
        '控制饮食，防止肥胖',
        '提供足够的活动空间',
        '定期进行心脏和关节检查',
        '注意毛发护理，防止毛球',
      ]),
      description: '缅因猫是最大的家猫品种之一，以其巨大的体型、浓密的被毛和温和的性格著称。它们性格温和、聪明，被称为"温柔的巨人"。',
      sizeCategory: 'large',
      temperament: '温和、聪明、友善、独立',
    },
    {
      name: '苏格兰折耳',
      species: 'cat',
      origin: '苏格兰',
      avgLifespan: '10-14年',
      commonDiseases: JSON.stringify([
        '骨软骨发育不良（OCD）',
        '肥厚型心肌病（HCM）',
        '多囊肾病（PKD）',
        '关节炎',
        '牙齿问题',
      ]),
      carePoints: JSON.stringify([
        '注意骨骼和关节健康',
        '控制体重，减轻关节负担',
        '定期梳理短毛',
        '定期进行心脏检查',
        '避免高跳和剧烈运动',
      ]),
      description: '苏格兰折耳猫以其向前下方折叠的耳朵为特征，是一种中等体型的猫种。它们性格温和、聪明、粘人，非常适合家庭饲养。',
      sizeCategory: 'medium',
      temperament: '温和、聪明、粘人、安静',
    },
    {
      name: '孟加拉豹猫',
      species: 'cat',
      origin: '美国',
      avgLifespan: '12-16年',
      commonDiseases: JSON.stringify([
        '肥厚型心肌病（HCM）',
        '进行性视网膜萎缩（PRA）',
        '多囊肾病（PKD）',
        '过敏',
        '肠道敏感',
      ]),
      carePoints: JSON.stringify([
        '提供大量运动和攀爬空间',
        '提供益智玩具和互动游戏',
        '定期梳理短毛',
        '注意饮食，防止肠道敏感',
        '定期进行心脏检查',
      ]),
      description: '孟加拉豹猫是一种具有野生外观的家猫品种，以其豹纹般的被毛和活泼的性格著称。它们精力充沛、聪明好动，需要大量运动。',
      sizeCategory: 'medium',
      temperament: '活泼、好动、聪明、好奇',
    },
  ];

  for (const breedData of breedsData) {
    const existing = await prisma.breed.findFirst({
      where: { name: breedData.name, species: breedData.species },
    });
    if (!existing) {
      await prisma.breed.create({ data: breedData });
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

  console.log('添加示例体重记录...');

  const weightRecords = [
    { petIndex: 0, weight: 22.5, daysAgo: 365, note: '成年初期' },
    { petIndex: 0, weight: 23.2, daysAgo: 270, note: '' },
    { petIndex: 0, weight: 24.0, daysAgo: 180, note: '饮食调整后' },
    { petIndex: 0, weight: 23.8, daysAgo: 90, note: '' },
    { petIndex: 0, weight: 24.5, daysAgo: 30, note: '最近体检' },
    { petIndex: 1, weight: 18.0, daysAgo: 365, note: '' },
    { petIndex: 1, weight: 18.5, daysAgo: 200, note: '' },
    { petIndex: 1, weight: 19.2, daysAgo: 60, note: '' },
    { petIndex: 4, weight: 32.0, daysAgo: 300, note: '' },
    { petIndex: 4, weight: 33.5, daysAgo: 150, note: '' },
    { petIndex: 4, weight: 34.0, daysAgo: 45, note: '' },
    { petIndex: 5, weight: 28.0, daysAgo: 250, note: '' },
    { petIndex: 5, weight: 28.8, daysAgo: 100, note: '' },
  ];

  for (const record of weightRecords) {
    const recordedAt = new Date();
    recordedAt.setDate(recordedAt.getDate() - record.daysAgo);
    await prisma.weightRecord.create({
      data: {
        petId: pets[record.petIndex].id,
        weight: record.weight,
        recordedAt,
        note: record.note || null,
      },
    });
    if (record.daysAgo <= 30) {
      await prisma.pet.update({
        where: { id: pets[record.petIndex].id },
        data: { weight: record.weight },
      });
    }
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
