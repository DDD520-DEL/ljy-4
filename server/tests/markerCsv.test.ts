import assert from 'node:assert/strict';
import {
  getCsvTemplate,
  exportGeneticMarkersToCsv,
  validateCsvFile,
  importGeneticMarkers,
  parseCsvBuffer,
  CsvConstants,
} from '../src/utils/markerCsv.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const testQueue: { name: string; fn: () => void | Promise<void> }[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  testQueue.push({ name, fn });
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function makeCsvBuffer(headers: string, rows: string[]): Buffer {
  const lines = [headers, ...rows];
  return Buffer.from(lines.join('\n'), 'utf-8');
}

const VALID_HEADERS =
  'markerName,geneName,chromosome,position,variant,disease,species,inheritance,riskLevel,description,reference';

const VALID_ROW =
  'MDR1,ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,dog,autosomal_recessive,high,ABCB1 test desc,PMID:123';

const VALID_ROW_2 =
  'PKD1,PKD1,,,c.10063C>A,PKD,cat,autosomal_dominant,high,,';

describe('getCsvTemplate', () => {
  test('返回 Buffer 而非 Promise 对象', async () => {
    const result = await getCsvTemplate();
    assert.ok(Buffer.isBuffer(result), 'getCsvTemplate 应返回 Buffer 实例');
  });

  test('返回的 Buffer 非空', async () => {
    const result = await getCsvTemplate();
    assert.ok(result.byteLength > 0, '返回的 Buffer 应有内容');
  });

  test('返回的内容包含 CSV 表头', async () => {
    const result = await getCsvTemplate();
    const text = result.toString('utf-8');
    assert.ok(text.includes('markerName'), '模板应包含 markerName 列');
    assert.ok(text.includes('geneName'), '模板应包含 geneName 列');
    assert.ok(text.includes('inheritance'), '模板应包含 inheritance 列');
  });

  test('返回的内容包含示例数据', async () => {
    const result = await getCsvTemplate();
    const text = result.toString('utf-8');
    assert.ok(text.includes('MDR1'), '模板应包含 MDR1 示例');
    assert.ok(text.includes('ABCB1'), '模板应包含 ABCB1 示例');
  });

  test('byteLength 属性可正确获取（Content-Length 兼容）', async () => {
    const result = await getCsvTemplate();
    assert.ok(
      typeof result.byteLength === 'number' && result.byteLength > 0,
      'byteLength 应为正数'
    );
    assert.ok(
      result.byteLength === result.length,
      'byteLength 与 length 应一致'
    );
  });
});

describe('exportGeneticMarkersToCsv', () => {
  test('返回 Buffer 实例', async () => {
    const result = await exportGeneticMarkersToCsv();
    assert.ok(Buffer.isBuffer(result), 'exportGeneticMarkersToCsv 应返回 Buffer');
  });

  test('byteLength 属性可正确获取', async () => {
    const result = await exportGeneticMarkersToCsv();
    assert.ok(
      typeof result.byteLength === 'number',
      'byteLength 应为数字'
    );
  });
});

describe('validateCsvFile - 基本校验', () => {
  test('有效数据行应全部通过校验', async () => {
    const buffer = makeCsvBuffer(VALID_HEADERS, [VALID_ROW]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.validRows, 1);
    assert.equal(result.invalidRows, 0);
    assert.equal(result.errors.length, 0);
    assert.equal(result.success, true);
  });

  test('多行有效数据', async () => {
    const buffer = makeCsvBuffer(VALID_HEADERS, [VALID_ROW, VALID_ROW_2]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.validRows, 2);
    assert.equal(result.invalidRows, 0);
    assert.equal(result.success, true);
  });

  test('空文件应返回 0 行', async () => {
    const buffer = makeCsvBuffer(VALID_HEADERS, []);
    const result = await validateCsvFile(buffer);
    assert.equal(result.totalRows, 0);
    assert.equal(result.validRows, 0);
  });
});

describe('validateCsvFile - 必填字段校验', () => {
  test('缺少标记名应报错', async () => {
    const row = ',ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,dog,autosomal_recessive,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'markerName'));
  });

  test('缺少基因名应报错', async () => {
    const row = 'MDR1,,14,23000000,c.227_228delAG,MDR1 deficiency,dog,autosomal_recessive,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'geneName'));
  });

  test('缺少变异类型应报错', async () => {
    const row = 'MDR1,ABCB1,14,23000000,,MDR1 deficiency,dog,autosomal_recessive,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'variant'));
  });

  test('缺少关联疾病应报错', async () => {
    const row = 'MDR1,ABCB1,14,23000000,c.227_228delAG,,dog,autosomal_recessive,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'disease'));
  });

  test('缺少物种应报错', async () => {
    const row = 'MDR1,ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,,autosomal_recessive,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'species'));
  });

  test('缺少遗传模式应报错', async () => {
    const row = 'MDR1,ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,dog,,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'inheritance'));
  });

  test('缺少风险等级应报错', async () => {
    const row = 'MDR1,ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,dog,autosomal_recessive,,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    assert.ok(result.errors.some((e) => e.field === 'riskLevel'));
  });
});

describe('validateCsvFile - 枚举字段校验', () => {
  test('无效的遗传模式应报错', async () => {
    const row =
      'MDR1,ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,dog,invalid_mode,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    const err = result.errors.find((e) => e.field === 'inheritance');
    assert.ok(err, '应有 inheritance 字段错误');
    assert.ok(err!.message.includes('无效'), '错误消息应提示无效');
    assert.ok(err!.message.includes('autosomal_dominant'), '错误消息应列出有效值');
  });

  test('无效的风险等级应报错', async () => {
    const row =
      'MDR1,ABCB1,14,23000000,c.227_228delAG,MDR1 deficiency,dog,autosomal_recessive,extreme,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.invalidRows, 1);
    const err = result.errors.find((e) => e.field === 'riskLevel');
    assert.ok(err, '应有 riskLevel 字段错误');
    assert.ok(err!.message.includes('无效'), '错误消息应提示无效');
  });

  test('所有有效的遗传模式均应通过', async () => {
    const modes = CsvConstants.VALID_INHERITANCE;
    const rows = modes.map(
      (m) =>
        `TestMarker,TestGene,1,1000,c.1A>T,test disease,dog,${m},low,,`
    );
    const buffer = makeCsvBuffer(VALID_HEADERS, rows);
    const result = await validateCsvFile(buffer);
    assert.equal(result.validRows, modes.length, `所有 ${modes.length} 种遗传模式应通过`);
    assert.equal(result.invalidRows, 0);
  });

  test('所有有效的风险等级均应通过', async () => {
    const levels = CsvConstants.VALID_RISK_LEVELS;
    const rows = levels.map(
      (l) =>
        `TestMarker_${l},TestGene,1,1000,c.1A>T,test disease,dog,autosomal_recessive,${l},,`
    );
    const buffer = makeCsvBuffer(VALID_HEADERS, rows);
    const result = await validateCsvFile(buffer);
    assert.equal(result.validRows, levels.length, `所有 ${levels.length} 种风险等级应通过`);
    assert.equal(result.invalidRows, 0);
  });
});

describe('validateCsvFile - 可选字段与数据转换', () => {
  test('染色体和位置为空时不应报错', async () => {
    const row =
      'MDR1,ABCB1,,,c.227_228delAG,MDR1 deficiency,dog,autosomal_recessive,high,,';
    const buffer = makeCsvBuffer(VALID_HEADERS, [row]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.validRows, 1);
    assert.equal(result.errors.length, 0);
  });

  test('描述和参考文献为空时不应报错', async () => {
    const buffer = makeCsvBuffer(VALID_HEADERS, [VALID_ROW_2]);
    const result = await validateCsvFile(buffer);
    assert.equal(result.validRows, 1);
    assert.equal(result.errors.length, 0);
  });
});

describe('validateCsvFile - 混合有效和无效行', () => {
  test('部分有效部分无效应分别计数', async () => {
    const rows = [VALID_ROW, 'Bad,,,,,,,invalid,extreme,,'];
    const buffer = makeCsvBuffer(VALID_HEADERS, rows);
    const result = await validateCsvFile(buffer);
    assert.equal(result.totalRows, 2);
    assert.equal(result.validRows, 1);
    assert.equal(result.invalidRows, 1);
    assert.equal(result.success, false);
    assert.ok(result.errors.length >= 2, '无效行应至少有 2 个字段错误');
  });
});

describe('parseCsvBuffer - 表头兼容性', () => {
  test('英文简写表头也能识别', async () => {
    const headers =
      'markerName,geneName,chromosome,position,variant,disease,species,inheritance,riskLevel,description,reference';
    const buffer = makeCsvBuffer(headers, [VALID_ROW]);
    const result = await parseCsvBuffer(buffer);
    assert.equal(result.totalRows, 1);
    assert.ok(result.rows[0].data !== null, '使用英文表头应能正常解析');
    assert.equal(result.rows[0].data!.markerName, 'MDR1');
  });
});

describe('CsvConstants', () => {
  test('VALID_INHERITANCE 包含预期值', () => {
    assert.ok(CsvConstants.VALID_INHERITANCE.includes('autosomal_dominant'));
    assert.ok(CsvConstants.VALID_INHERITANCE.includes('autosomal_recessive'));
    assert.ok(CsvConstants.VALID_INHERITANCE.includes('x_linked'));
    assert.ok(CsvConstants.VALID_INHERITANCE.length >= 8);
  });

  test('VALID_RISK_LEVELS 包含预期值', () => {
    assert.ok(CsvConstants.VALID_RISK_LEVELS.includes('high'));
    assert.ok(CsvConstants.VALID_RISK_LEVELS.includes('medium'));
    assert.ok(CsvConstants.VALID_RISK_LEVELS.includes('low'));
    assert.ok(CsvConstants.VALID_RISK_LEVELS.includes('carrier'));
  });

  test('VALID_SPECIES 包含预期值', () => {
    assert.ok(CsvConstants.VALID_SPECIES.includes('dog'));
    assert.ok(CsvConstants.VALID_SPECIES.includes('cat'));
  });

  test('CSV_COLUMNS 包含所有 11 列', () => {
    assert.equal(CsvConstants.CSV_COLUMNS.length, 11);
    const keys = CsvConstants.CSV_COLUMNS.map((c) => c.key);
    assert.ok(keys.includes('markerName'));
    assert.ok(keys.includes('geneName'));
    assert.ok(keys.includes('inheritance'));
    assert.ok(keys.includes('riskLevel'));
  });
});

(async () => {
  for (const t of testQueue) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err: any) {
      failed++;
      failures.push(t.name);
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${err.message}`);
      if (err.expected !== undefined) {
        console.log(`    expected: ${JSON.stringify(err.expected)}`);
        console.log(`    actual:   ${JSON.stringify(err.actual)}`);
      }
    }
  }

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
})();
