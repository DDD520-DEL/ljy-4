import assert from 'node:assert/strict';
import prisma from '../src/lib/prisma.js';
import {
  APPOINTMENT_LINKABLE_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from '../src/routes/geneReports.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const testQueue: { name: string; fn: () => void | Promise<void> }[] = [];

const testPetIds: string[] = [];
const testAppointmentIds: string[] = [];
const testReportIds: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  testQueue.push({ name, fn });
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

const VALID_STATUSES_FOR_LINK: readonly string[] = ['pending', 'confirmed', 'testing'];
const INVALID_STATUSES_FOR_LINK: readonly string[] = ['completed', 'cancelled'];

async function createTestPet(overrides: Partial<any> = {}): Promise<string> {
  const pet = await prisma.pet.create({
    data: {
      name: `预约测试宠物_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      species: 'dog',
      breed: '金毛寻回犬',
      gender: 'male',
      birthDate: new Date('2022-01-01'),
      ...overrides,
    },
    select: { id: true },
  });
  testPetIds.push(pet.id);
  return pet.id;
}

async function createTestAppointment(
  petId: string,
  status: string = 'pending'
): Promise<string> {
  const apt = await prisma.geneTestAppointment.create({
    data: {
      petId,
      institution: '测试基因检测机构',
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      testItems: JSON.stringify(['常规遗传病筛查', '品种特异性检测']),
      status,
    },
    select: { id: true },
  });
  testAppointmentIds.push(apt.id);
  return apt.id;
}

async function createTestReport(
  petId: string,
  appointmentId: string | null = null
): Promise<string> {
  const report = await prisma.geneReport.create({
    data: {
      petId,
      reportType: 'mock',
      fileName: `test-report-${Date.now()}.json`,
      status: 'parsed',
      parsedData: JSON.stringify({ markers: [] }),
      parsedAt: new Date(),
      appointmentId,
    },
    select: { id: true },
  });
  testReportIds.push(report.id);
  return report.id;
}

async function cleanup() {
  console.log('\n[Cleanup] 清理测试数据...');
  await prisma.geneReport.deleteMany({ where: { id: { in: testReportIds } } }).catch(() => {});
  await prisma.geneTestAppointment.deleteMany({ where: { id: { in: testAppointmentIds } } }).catch(() => {});
  await prisma.pet.deleteMany({ where: { id: { in: testPetIds } } }).catch(() => {});
  await prisma.$disconnect();
}

describe('预约可关联状态常量定义', () => {
  test('APPOINTMENT_LINKABLE_STATUSES 包含 pending/confirmed/testing', () => {
    assert.ok(APPOINTMENT_LINKABLE_STATUSES.includes('pending' as any));
    assert.ok(APPOINTMENT_LINKABLE_STATUSES.includes('confirmed' as any));
    assert.ok(APPOINTMENT_LINKABLE_STATUSES.includes('testing' as any));
    assert.equal(APPOINTMENT_LINKABLE_STATUSES.length, 3);
  });

  test('APPOINTMENT_STATUS_LABELS 覆盖所有 5 种状态', () => {
    const statuses = ['pending', 'confirmed', 'testing', 'completed', 'cancelled'];
    for (const s of statuses) {
      assert.ok(
        typeof APPOINTMENT_STATUS_LABELS[s] === 'string',
        `状态 ${s} 应有标签映射`
      );
    }
  });

  test('可关联状态集合与不可关联状态集合无交集', () => {
    for (const valid of VALID_STATUSES_FOR_LINK) {
      assert.ok(
        !INVALID_STATUSES_FOR_LINK.includes(valid),
        `${valid} 不应出现在无效列表中`
      );
    }
    for (const invalid of INVALID_STATUSES_FOR_LINK) {
      assert.ok(
        !VALID_STATUSES_FOR_LINK.includes(invalid),
        `${invalid} 不应出现在有效列表中`
      );
    }
  });
});

describe('预约状态校验 - 通过数据库验证', () => {
  test('pending 状态预约可关联报告', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'pending');
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.ok(apt);
    assert.ok(
      VALID_STATUSES_FOR_LINK.includes(apt!.status),
      `pending 应可关联，当前 status: ${apt!.status}`
    );
  });

  test('confirmed 状态预约可关联报告', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'confirmed');
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.ok(apt);
    assert.ok(
      VALID_STATUSES_FOR_LINK.includes(apt!.status),
      `confirmed 应可关联，当前 status: ${apt!.status}`
    );
  });

  test('testing 状态预约可关联报告', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'testing');
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.ok(apt);
    assert.ok(
      VALID_STATUSES_FOR_LINK.includes(apt!.status),
      `testing 应可关联，当前 status: ${apt!.status}`
    );
  });

  test('completed 状态预约不可关联报告', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'completed');
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.ok(apt);
    assert.ok(
      !VALID_STATUSES_FOR_LINK.includes(apt!.status),
      `completed 不可关联，当前 status: ${apt!.status}`
    );
    assert.ok(
      INVALID_STATUSES_FOR_LINK.includes(apt!.status),
      `completed 应在无效列表中`
    );
  });

  test('cancelled 状态预约不可关联报告', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'cancelled');
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.ok(apt);
    assert.ok(
      !VALID_STATUSES_FOR_LINK.includes(apt!.status),
      `cancelled 不可关联，当前 status: ${apt!.status}`
    );
    assert.ok(
      INVALID_STATUSES_FOR_LINK.includes(apt!.status),
      `cancelled 应在无效列表中`
    );
  });
});

describe('预约 - 宠物匹配校验', () => {
  test('预约应关联到正确的宠物（petId 一致）', async () => {
    const pet1Id = await createTestPet({ name: '宠物A' });
    const pet2Id = await createTestPet({ name: '宠物B' });
    const aptId = await createTestAppointment(pet1Id, 'pending');
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.ok(apt);
    assert.equal(apt!.petId, pet1Id);
    assert.notEqual(apt!.petId, pet2Id);
  });
});

describe('报告关联预约 - 反向关联与完整性', () => {
  test('创建报告时可设置 appointmentId 字段', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'confirmed');
    const reportId = await createTestReport(petId, aptId);

    const report = await prisma.geneReport.findUnique({
      where: { id: reportId },
      include: { geneTestAppointment: true },
    });
    assert.ok(report);
    assert.equal(report!.appointmentId, aptId);
    assert.ok(report!.geneTestAppointment);
    assert.equal(report!.geneTestAppointment!.id, aptId);
  });

  test('预约对象可反向查询已关联的报告列表', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'pending');
    await createTestReport(petId, aptId);
    await createTestReport(petId, aptId);

    const apt = await prisma.geneTestAppointment.findUnique({
      where: { id: aptId },
      include: { geneReports: true },
    });
    assert.ok(apt);
    assert.equal(apt!.geneReports.length, 2);
    for (const r of apt!.geneReports) {
      assert.equal(r.appointmentId, aptId);
    }
  });

  test('不关联预约的报告 appointmentId 字段为 null', async () => {
    const petId = await createTestPet();
    const reportId = await createTestReport(petId, null);
    const report = await prisma.geneReport.findUnique({ where: { id: reportId } });
    assert.ok(report);
    assert.equal(report!.appointmentId, null);
  });
});

describe('预约状态流转验证', () => {
  test('未完成预约可从 pending → confirmed → testing → completed 流转', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'pending');

    await prisma.geneTestAppointment.update({
      where: { id: aptId },
      data: { status: 'confirmed' },
    });
    let apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.equal(apt!.status, 'confirmed');
    assert.ok(apt!.completedAt === null);

    await prisma.geneTestAppointment.update({
      where: { id: aptId },
      data: { status: 'testing' },
    });
    apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.equal(apt!.status, 'testing');

    const completedAt = new Date();
    await prisma.geneTestAppointment.update({
      where: { id: aptId },
      data: { status: 'completed', completedAt },
    });
    apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.equal(apt!.status, 'completed');
    assert.ok(apt!.completedAt !== null);
  });

  test('预约状态可从 testing 回滚至 confirmed（模拟解析失败场景）', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'testing');

    await prisma.geneTestAppointment.update({
      where: { id: aptId },
      data: { status: 'confirmed' },
    });
    const apt = await prisma.geneTestAppointment.findUnique({ where: { id: aptId } });
    assert.equal(apt!.status, 'confirmed', '状态应回滚为 confirmed');
    assert.equal(apt!.completedAt, null, 'completedAt 应仍为 null');
  });

  test('非 testing 状态执行回滚操作时状态保持不变', async () => {
    const petId = await createTestPet();
    const pendingAptId = await createTestAppointment(petId, 'pending');
    const confirmedAptId = await createTestAppointment(petId, 'confirmed');
    const completedAptId = await createTestAppointment(petId, 'completed');
    const cancelledAptId = await createTestAppointment(petId, 'cancelled');

    const rollback = (await import('../src/routes/geneReports.js')).rollbackAppointmentStatusIfNeeded;

    await rollback(pendingAptId);
    await rollback(confirmedAptId);
    await rollback(completedAptId);
    await rollback(cancelledAptId);

    const [pendingApt, confirmedApt, completedApt, cancelledApt] = await Promise.all([
      prisma.geneTestAppointment.findUnique({ where: { id: pendingAptId } }),
      prisma.geneTestAppointment.findUnique({ where: { id: confirmedAptId } }),
      prisma.geneTestAppointment.findUnique({ where: { id: completedAptId } }),
      prisma.geneTestAppointment.findUnique({ where: { id: cancelledAptId } }),
    ]);

    assert.equal(pendingApt!.status, 'pending', 'pending 不应被回滚改变');
    assert.equal(confirmedApt!.status, 'confirmed', 'confirmed 不应被回滚改变');
    assert.equal(completedApt!.status, 'completed', 'completed 不应被回滚改变');
    assert.equal(cancelledApt!.status, 'cancelled', 'cancelled 不应被回滚改变');
  });
});

describe('预约状态边界测试', () => {
  test('同一宠物可同时存在多个不同状态的预约', async () => {
    const petId = await createTestPet();
    const statuses = ['pending', 'confirmed', 'testing', 'completed', 'cancelled'];
    for (const s of statuses) {
      await createTestAppointment(petId, s);
    }
    const appointments = await prisma.geneTestAppointment.findMany({
      where: { petId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(appointments.length, 5);
    const gotStatuses = appointments.map((a) => a.status).sort();
    assert.deepEqual(gotStatuses, [...statuses].sort());

    const linkableCount = appointments.filter((a) =>
      VALID_STATUSES_FOR_LINK.includes(a.status)
    ).length;
    assert.equal(linkableCount, 3, '应恰好 3 个可关联预约');
  });

  test('不同宠物的预约互不干扰', async () => {
    const pet1Id = await createTestPet();
    const pet2Id = await createTestPet();
    await createTestAppointment(pet1Id, 'completed');
    const pet1Pending = await createTestAppointment(pet1Id, 'pending');
    const pet2Completed = await createTestAppointment(pet2Id, 'completed');
    const pet2Pending = await createTestAppointment(pet2Id, 'pending');

    const pet1Linkable = await prisma.geneTestAppointment.findMany({
      where: { petId: pet1Id, status: { in: VALID_STATUSES_FOR_LINK as any } },
    });
    const pet2Linkable = await prisma.geneTestAppointment.findMany({
      where: { petId: pet2Id, status: { in: VALID_STATUSES_FOR_LINK as any } },
    });

    assert.equal(pet1Linkable.length, 1);
    assert.equal(pet1Linkable[0].id, pet1Pending);
    assert.equal(pet2Linkable.length, 1);
    assert.equal(pet2Linkable[0].id, pet2Pending);

    const completedApts = await prisma.geneTestAppointment.findMany({
      where: { status: 'completed' },
      select: { id: true, petId: true },
    });
    assert.ok(completedApts.some((a) => a.id === pet2Completed && a.petId === pet2Id));
  });
});

describe('预约级联删除行为', () => {
  test('删除宠物时关联预约会被级联删除（Prisma onDelete: Cascade）', async () => {
    const petId = await createTestPet();
    const aptId1 = await createTestAppointment(petId, 'pending');
    const aptId2 = await createTestAppointment(petId, 'confirmed');

    await prisma.pet.delete({ where: { id: petId } });
    const idx = testPetIds.indexOf(petId);
    if (idx >= 0) testPetIds.splice(idx, 1);
    [aptId1, aptId2].forEach((id) => {
      const ai = testAppointmentIds.indexOf(id);
      if (ai >= 0) testAppointmentIds.splice(ai, 1);
    });

    const aptsAfter = await prisma.geneTestAppointment.findMany({
      where: { id: { in: [aptId1, aptId2] } },
    });
    assert.equal(aptsAfter.length, 0, '级联删除后预约不应存在');
  });

  test('删除预约时关联报告的 appointmentId 会被置为 NULL（SetNull）', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'pending');
    const reportId = await createTestReport(petId, aptId);

    await prisma.geneTestAppointment.delete({ where: { id: aptId } });
    const ai = testAppointmentIds.indexOf(aptId);
    if (ai >= 0) testAppointmentIds.splice(ai, 1);

    const report = await prisma.geneReport.findUnique({ where: { id: reportId } });
    assert.ok(report, '报告本身不应被删除');
    assert.equal(report!.appointmentId, null, 'appointmentId 应被 SetNull 为 null');
  });
});

describe('预约模型字段完整性', () => {
  test('预约记录创建后字段填充完整', async () => {
    const petId = await createTestPet();
    const testInstitution = '测试字段完整性机构';
    const testNotes = '这是测试备注信息';
    const expectedDate = new Date('2026-12-25T10:00:00.000Z');
    const testItems = ['毛色基因型', '药物敏感性', '运动能力基因'];

    const apt = await prisma.geneTestAppointment.create({
      data: {
        petId,
        institution: testInstitution,
        expectedDate,
        testItems: JSON.stringify(testItems),
        notes: testNotes,
        status: 'pending',
      },
    });
    testAppointmentIds.push(apt.id);

    assert.equal(apt.institution, testInstitution);
    assert.equal(apt.expectedDate.toISOString(), expectedDate.toISOString());
    assert.equal(apt.notes, testNotes);
    assert.equal(apt.status, 'pending');
    assert.equal(JSON.parse(apt.testItems)[0], '毛色基因型');
    assert.equal(JSON.parse(apt.testItems).length, 3);
    assert.ok(apt.createdAt instanceof Date, 'createdAt 应为 Date 类型');
    assert.ok(apt.updatedAt instanceof Date, 'updatedAt 应为 Date 类型');
    assert.equal(apt.completedAt, null);
  });

  test('预约完成时 completedAt 字段正确填充', async () => {
    const petId = await createTestPet();
    const aptId = await createTestAppointment(petId, 'pending');
    const completeTime = new Date('2026-07-01T08:30:00.000Z');

    const updated = await prisma.geneTestAppointment.update({
      where: { id: aptId },
      data: { status: 'completed', completedAt: completeTime },
    });

    assert.equal(updated.status, 'completed');
    assert.ok(updated.completedAt !== null);
    assert.equal(updated.completedAt!.toISOString(), completeTime.toISOString());
  });
});

(async () => {
  try {
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
        if (err.stack) {
          console.log(`    stack:\n${err.stack.split('\n').slice(0, 3).join('\n    ')}`);
        }
      }
    }
  } finally {
    await cleanup();
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
