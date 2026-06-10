import assert from 'node:assert/strict';
import {
  isAffectedGenotype,
  isCarrierGenotype,
  isClearGenotype,
  determineMarkerStatus,
  mergeStatus,
  aggregateDiseaseByPet,
  MarkerWithDisease,
} from '../src/utils/diseaseAggregation.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    if (err.expected !== undefined) {
      console.log(`    expected: ${JSON.stringify(err.expected)}`);
      console.log(`    actual:   ${JSON.stringify(err.actual)}`);
    }
  }
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

const createMarker = (
  petId: string,
  disease: string,
  genotype: string,
  zygosity: string | null,
  species = 'dog',
  markerName = 'marker1',
  inheritance = 'autosomal_recessive'
): MarkerWithDisease => ({
  petId,
  genotype,
  zygosity,
  marker: { markerName, disease, species, inheritance },
});

describe('isAffectedGenotype', () => {
  test('homozygous zygosity → affected', () => {
    assert.equal(isAffectedGenotype('anything', 'homozygous'), true);
  });
  test('M/M genotype → affected', () => {
    assert.equal(isAffectedGenotype('M/M', null), true);
  });
  test('m/m genotype → affected', () => {
    assert.equal(isAffectedGenotype('m/m', null), true);
  });
  test('heterozygous → not affected', () => {
    assert.equal(isAffectedGenotype('N/M', 'heterozygous'), false);
  });
  test('N/N → not affected', () => {
    assert.equal(isAffectedGenotype('N/N', null), false);
  });
});

describe('isCarrierGenotype', () => {
  test('heterozygous zygosity → carrier', () => {
    assert.equal(isCarrierGenotype('anything', 'heterozygous'), true);
  });
  test('N/M genotype → carrier', () => {
    assert.equal(isCarrierGenotype('N/M', null), true);
  });
  test('N/m genotype → carrier', () => {
    assert.equal(isCarrierGenotype('N/m', null), true);
  });
  test('homozygous → not carrier', () => {
    assert.equal(isCarrierGenotype('M/M', 'homozygous'), false);
  });
  test('N/N → not carrier', () => {
    assert.equal(isCarrierGenotype('N/N', null), false);
  });
});

describe('isClearGenotype', () => {
  test('N/N with null zygosity → clear', () => {
    assert.equal(isClearGenotype('N/N', null), true);
  });
  test('N/N with heterozygous → not clear', () => {
    assert.equal(isClearGenotype('N/N', 'heterozygous'), false);
  });
  test('N/M → not clear', () => {
    assert.equal(isClearGenotype('N/M', null), false);
  });
});

describe('determineMarkerStatus', () => {
  test('homozygous → affected', () => {
    assert.equal(determineMarkerStatus('M/M', 'homozygous'), 'affected');
  });
  test('heterozygous → carrier', () => {
    assert.equal(determineMarkerStatus('N/M', 'heterozygous'), 'carrier');
  });
  test('N/N → clear', () => {
    assert.equal(determineMarkerStatus('N/N', null), 'clear');
  });
  test('unknown genotype → null', () => {
    assert.equal(determineMarkerStatus('未检测', null), null);
  });
});

describe('mergeStatus', () => {
  test('undefined + carrier → carrier', () => {
    assert.equal(mergeStatus(undefined, 'carrier'), 'carrier');
  });
  test('carrier + null → carrier', () => {
    assert.equal(mergeStatus('carrier', null), 'carrier');
  });
  test('carrier + affected → affected (upgrade)', () => {
    assert.equal(mergeStatus('carrier', 'affected'), 'affected');
  });
  test('affected + carrier → affected (no downgrade)', () => {
    assert.equal(mergeStatus('affected', 'carrier'), 'affected');
  });
  test('clear + carrier → carrier (upgrade)', () => {
    assert.equal(mergeStatus('clear', 'carrier'), 'carrier');
  });
  test('carrier + clear → carrier (no downgrade)', () => {
    assert.equal(mergeStatus('carrier', 'clear'), 'carrier');
  });
  test('affected + affected → affected', () => {
    assert.equal(mergeStatus('affected', 'affected'), 'affected');
  });
});

describe('aggregateDiseaseByPet', () => {
  test('empty input → empty result', () => {
    const result = aggregateDiseaseByPet([]);
    assert.deepEqual(result, []);
  });

  test('single pet, single marker → correct counts', () => {
    const data = [createMarker('pet1', '心脏病', 'N/N', null)];
    const result = aggregateDiseaseByPet(data);
    assert.equal(result.length, 1);
    assert.equal(result[0].disease, '心脏病');
    assert.equal(result[0].testedCount, 1);
    assert.equal(result[0].clearCount, 1);
    assert.equal(result[0].affectedCount, 0);
    assert.equal(result[0].carrierCount, 0);
  });

  test('same pet with multiple markers for same disease → NOT double counted (核心修复验证)', () => {
    const data = [
      createMarker('pet1', '心脏病', 'N/M', 'heterozygous', 'dog', 'marker1'),
      createMarker('pet1', '心脏病', 'N/M', 'heterozygous', 'dog', 'marker2'),
    ];
    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 1);
    assert.equal(result[0].testedCount, 1, 'testedCount 应该为 1（同一只宠物去重）');
    assert.equal(result[0].carrierCount, 1);
    assert.equal(result[0].affectedCount, 0);
  });

  test('pet with carrier marker + affected marker → counted as affected (取最严重状态)', () => {
    const data = [
      createMarker('pet1', '心脏病', 'N/M', 'heterozygous', 'dog', 'marker1'),
      createMarker('pet1', '心脏病', 'M/M', 'homozygous', 'dog', 'marker2'),
    ];
    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 1);
    assert.equal(result[0].testedCount, 1);
    assert.equal(result[0].affectedCount, 1);
    assert.equal(result[0].carrierCount, 0);
    assert.equal(result[0].clearCount, 0);
  });

  test('multiple pets with same disease → correct aggregation', () => {
    const data = [
      createMarker('pet1', '心脏病', 'M/M', 'homozygous'),
      createMarker('pet2', '心脏病', 'N/M', 'heterozygous'),
      createMarker('pet3', '心脏病', 'N/N', null),
      createMarker('pet4', '心脏病', 'N/N', null),
    ];
    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 1);
    assert.equal(result[0].testedCount, 4);
    assert.equal(result[0].affectedCount, 1);
    assert.equal(result[0].carrierCount, 1);
    assert.equal(result[0].clearCount, 2);
  });

  test('same disease name, different species → separate entries', () => {
    const data = [
      createMarker('pet1', '心脏病', 'M/M', 'homozygous', 'dog'),
      createMarker('pet2', '心脏病', 'M/M', 'homozygous', 'cat'),
    ];
    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 2);
    const dog = result.find((r) => r.species === 'dog');
    const cat = result.find((r) => r.species === 'cat');
    assert.equal(dog?.testedCount, 1);
    assert.equal(cat?.testedCount, 1);
  });

  test('multiple distinct diseases → separate entries', () => {
    const data = [
      createMarker('pet1', '心脏病', 'M/M', 'homozygous', 'dog', 'marker1'),
      createMarker('pet1', '肾病', 'N/M', 'heterozygous', 'dog', 'marker2'),
      createMarker('pet2', '心脏病', 'N/N', null, 'dog', 'marker1'),
      createMarker('pet2', '肾病', 'N/N', null, 'dog', 'marker2'),
    ];
    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 2);
    const heart = result.find((r) => r.disease === '心脏病');
    const kidney = result.find((r) => r.disease === '肾病');

    assert.equal(heart?.testedCount, 2);
    assert.equal(heart?.affectedCount, 1);
    assert.equal(heart?.clearCount, 1);

    assert.equal(kidney?.testedCount, 2);
    assert.equal(kidney?.carrierCount, 1);
    assert.equal(kidney?.clearCount, 1);
  });

  test('results sorted by affectedCount descending', () => {
    const data = [
      createMarker('pet1', '常见病', 'M/M', 'homozygous'),
      createMarker('pet2', '常见病', 'M/M', 'homozygous'),
      createMarker('pet3', '常见病', 'M/M', 'homozygous'),
      createMarker('pet1', '罕见病', 'M/M', 'homozygous'),
    ];
    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 2);
    assert.equal(result[0].disease, '常见病');
    assert.equal(result[0].affectedCount, 3);
    assert.equal(result[1].disease, '罕见病');
    assert.equal(result[1].affectedCount, 1);
  });

  test('频率不超过 100% — 每只宠物 3 个标记的极端情况', () => {
    const totalPets = 10;
    const data: MarkerWithDisease[] = [];

    for (let i = 0; i < totalPets; i++) {
      data.push(createMarker(`pet${i}`, '心脏病', 'N/M', 'heterozygous', 'dog', 'marker1'));
      data.push(createMarker(`pet${i}`, '心脏病', 'N/N', null, 'dog', 'marker2'));
      data.push(createMarker(`pet${i}`, '心脏病', 'M/M', 'homozygous', 'dog', 'marker3'));
    }

    const result = aggregateDiseaseByPet(data);

    assert.equal(result.length, 1);
    assert.equal(result[0].testedCount, totalPets, 'testedCount 应等于宠物总数（去重）');
    assert.equal(result[0].affectedCount, totalPets, '所有宠物至少有一个 affected 标记');
    assert.equal(result[0].carrierCount, 0);
    assert.equal(result[0].clearCount, 0);

    const detectionRate = result[0].affectedCount / totalPets;
    assert.ok(detectionRate <= 1, `检测频率 ${detectionRate} 不应超过 100%`);
    assert.equal(detectionRate, 1);
  });

  test('carrier count 也应去重', () => {
    const petIds = ['pet1', 'pet2', 'pet3', 'pet4', 'pet5'];
    const data: MarkerWithDisease[] = [];

    for (const petId of petIds) {
      data.push(createMarker(petId, '心脏病', 'N/M', 'heterozygous', 'dog', 'marker_a'));
      data.push(createMarker(petId, '心脏病', 'N/M', 'heterozygous', 'dog', 'marker_b'));
    }

    const result = aggregateDiseaseByPet(data);

    assert.equal(result[0].testedCount, 5);
    assert.equal(result[0].carrierCount, 5);

    const carrierRate = result[0].carrierCount / petIds.length;
    assert.equal(carrierRate, 1);
    assert.ok(carrierRate <= 1, '携带率不应超过 100%');
  });
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`通过: ${passed}, 失败: ${failed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

if (failed > 0) {
  console.log(`\n失败的测试:`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\n所有测试通过 ✓');
  process.exit(0);
}
