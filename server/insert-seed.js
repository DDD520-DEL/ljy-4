import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始插入遗传疾病数据...');

  const diseases = [
    {
      name: '多药耐药性（MDR1缺陷）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '对伊维菌素等药物敏感',
        '震颤、癫痫发作',
        '失明、共济失调',
        '严重时可导致昏迷或死亡',
      ]),
      affectedBreeds: JSON.stringify([
        '边境牧羊犬',
        '澳大利亚牧羊犬',
        '喜乐蒂牧羊犬',
        '柯利犬',
        '惠比特犬',
      ]),
      references: JSON.stringify([
        {
          title: 'MDR1基因缺陷 - 美国兽医医学协会',
          url: 'https://www.avma.org/resources-tools/animal-health-and-welfare/mdr1-gene-mutation',
        },
      ]),
      description: 'MDR1基因缺失突变导致P-糖蛋白功能缺陷，影响血脑屏障对药物的外排作用。',
      riskLevel: 'high',
      prevalence: '约30%-50%的边境牧羊犬携带此突变',
    },
    {
      name: '多囊肾病（PKD）',
      species: 'cat',
      inheritance: 'autosomal_dominant',
      symptoms: JSON.stringify([
        '肾脏增大',
        '肾功能不全',
        '多饮多尿',
        '食欲下降',
        '体重减轻',
      ]),
      affectedBreeds: JSON.stringify([
        '波斯猫',
        '布偶猫',
        '英国短毛猫',
        '苏格兰折耳猫',
      ]),
      references: JSON.stringify([
        {
          title: '猫多囊肾病 - 国际猫病协会',
          url: 'https://www.fabcats.org/owners/kidney/pkd.html',
        },
      ]),
      description: 'PKD1基因突变导致肾脏形成多个充满液体的囊肿。',
      riskLevel: 'high',
      prevalence: '波斯猫中患病率约30-40%',
    },
    {
      name: '肥厚型心肌病（HCM）',
      species: 'cat',
      inheritance: 'autosomal_dominant',
      symptoms: JSON.stringify([
        '呼吸困难',
        '活动耐量下降',
        '突然死亡',
        '后肢麻痹',
      ]),
      affectedBreeds: JSON.stringify([
        '缅因猫',
        '布偶猫',
        '英国短毛猫',
      ]),
      references: JSON.stringify([
        {
          title: '猫肥厚型心肌病',
          url: 'https://acvim.org/guidelines/feline-hypertrophic-cardiomyopathy/',
        },
      ]),
      description: 'MYBPC3基因突变导致心肌异常增厚。',
      riskLevel: 'high',
      prevalence: '缅因猫中约15%携带突变基因',
    },
    {
      name: '进行性视网膜萎缩（prcd型）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '夜间视力下降',
        '瞳孔散大',
        '进行性视力减退',
        '最终完全失明',
      ]),
      affectedBreeds: JSON.stringify([
        '贵宾犬',
        '可卡犬',
        '拉布拉多',
        '金毛寻回犬',
      ]),
      references: null,
      description: 'prcd基因缺陷导致视网膜感光细胞进行性退化。',
      riskLevel: 'high',
      prevalence: '在多个品种中广泛存在',
    },
    {
      name: '退行性脊髓病（DM）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '后肢共济失调',
        '后肢无力',
        '进行性瘫痪',
        '尿便失禁',
      ]),
      affectedBreeds: JSON.stringify([
        '德国牧羊犬',
        '威尔士柯基犬',
        '西伯利亚哈士奇',
      ]),
      references: null,
      description: 'SOD1基因突变导致脊髓白质退行性变。',
      riskLevel: 'medium',
      prevalence: '约0.5-1%的犬只受影响',
    },
    {
      name: '血管性血友病1型（vWD1）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '黏膜出血',
        '术后出血不止',
        '鼻出血',
        '牙龈出血',
      ]),
      affectedBreeds: JSON.stringify([
        '杜宾犬',
        '德国牧羊犬',
        '贵宾犬',
      ]),
      references: null,
      description: 'vWF基因缺陷导致血管性血友病因子缺乏。',
      riskLevel: 'medium',
      prevalence: '杜宾犬中患病率约15-30%',
    },
    {
      name: '进行性视网膜萎缩（rdAc型）',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '夜间视力下降',
        '眼球震颤',
        '进行性视力减退',
        '完全失明',
      ]),
      affectedBreeds: JSON.stringify([
        '阿比西尼亚猫',
        '索马里猫',
      ]),
      references: null,
      description: 'CEP290基因突变导致视网膜感光细胞发育异常。',
      riskLevel: 'high',
      prevalence: '阿比西尼亚猫中约30%为携带者',
    },
    {
      name: '糖原贮积症Ⅳ型',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '肌肉无力',
        '运动障碍',
        '心脏扩大',
        '肝功能异常',
      ]),
      affectedBreeds: JSON.stringify([
        '挪威森林猫',
      ]),
      references: null,
      description: 'PYGB基因突变导致糖原分支酶缺乏。',
      riskLevel: 'high',
      prevalence: '挪威森林猫中约10-15%为携带者',
    },
    {
      name: 'X连锁遗传性肾病（Alport综合征）',
      species: 'dog',
      inheritance: 'x_linked',
      symptoms: JSON.stringify([
        '蛋白尿',
        '肾功能进行性减退',
        '尿毒症',
      ]),
      affectedBreeds: JSON.stringify([
        '萨摩耶犬',
        '斗牛犬',
      ]),
      references: null,
      description: 'COL4A5基因突变导致肾小球基底膜结构异常。',
      riskLevel: 'high',
      prevalence: '萨摩耶犬中已有多个家系报道',
    },
    {
      name: '高尿酸尿症（HUU）',
      species: 'dog',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '尿结石',
        '尿血',
        '尿频',
        '尿道梗阻',
      ]),
      affectedBreeds: JSON.stringify([
        '大麦町犬',
        '英国斗牛犬',
      ]),
      references: null,
      description: 'HAO1基因突变导致尿酸酶缺乏。',
      riskLevel: 'medium',
      prevalence: '大麦町犬几乎100%受影响',
    },
    {
      name: 'GM1神经节苷脂贮积症',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '共济失调',
        '震颤',
        '视力障碍',
        '进行性神经衰退',
      ]),
      affectedBreeds: JSON.stringify([
        '缅甸猫',
        '暹罗猫',
      ]),
      references: null,
      description: 'GLB1基因突变导致β-半乳糖苷酶缺乏。',
      riskLevel: 'high',
      prevalence: '在特定品种中有散发病例',
    },
    {
      name: '脊髓性肌肉萎缩（SMA）',
      species: 'cat',
      inheritance: 'autosomal_recessive',
      symptoms: JSON.stringify([
        '后肢肌肉萎缩',
        '步态异常',
        '跳跃能力下降',
        '骨骼肌无力',
      ]),
      affectedBreeds: JSON.stringify([
        '缅因猫',
      ]),
      references: null,
      description: 'LIX1基因突变导致脊髓前角运动神经元退行性变。',
      riskLevel: 'high',
      prevalence: '缅因猫中约10-15%为携带者',
    },
  ];

  for (const disease of diseases) {
    const existing = await prisma.geneticDisease.findFirst({
      where: { name: disease.name, species: disease.species },
    });
    if (!existing) {
      await prisma.geneticDisease.create({ data: disease });
      console.log(`✓ 已创建: ${disease.name}`);
    } else {
      console.log(`- 已存在: ${disease.name}`);
    }
  }

  console.log('遗传疾病数据插入完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
