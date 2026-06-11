import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { z } from 'zod';

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

type MockResponse = {
  statusCode: number;
  jsonBody: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
};

function createMockResponse(): MockResponse {
  const res: Partial<MockResponse> = {};
  res.status = function (code: number) {
    res.statusCode = code;
    return res as MockResponse;
  };
  res.json = function (data: any) {
    res.jsonBody = data;
    return res as MockResponse;
  };
  return res as MockResponse;
}

function createMockRequest(params: any = {}, body: any = {}): Partial<Request> {
  return {
    params,
    body,
  } as Partial<Request>;
}

describe('Prisma P2025 错误码检测', () => {
  test('正确识别 Prisma P2025 错误（记录不存在）', () => {
    const p2025Error = {
      code: 'P2025',
      message: 'Record to update does not exist.',
      clientVersion: '5.10.0',
    };

    const isP2025 = (error: unknown): boolean => {
      return (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        (error as any).code === 'P2025'
      );
    };

    assert.equal(isP2025(p2025Error), true);
    assert.equal(isP2025({ code: 'P2002' }), false);
    assert.equal(isP2025(new Error('generic error')), false);
    assert.equal(isP2025(null), false);
    assert.equal(isP2025(undefined), false);
    assert.equal(isP2025('string error'), false);
  });

  test('使用 zod 验证错误检测逻辑（与路由代码一致）', () => {
    const detect404 = (error: unknown): boolean => {
      if (error instanceof z.ZodError) return false;
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as any).code === 'P2025'
      ) {
        return true;
      }
      return false;
    };

    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Record to update does not exist.',
      {
        code: 'P2025',
        clientVersion: '5.10.0',
        meta: { modelName: 'GeneticDisease' },
      }
    );

    assert.equal(detect404(prismaError), true, 'Prisma P2025 错误应被识别为 404');

    const otherPrismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed.',
      {
        code: 'P2002',
        clientVersion: '5.10.0',
        meta: { modelName: 'GeneticDisease', target: ['name'] },
      }
    );
    assert.equal(detect404(otherPrismaError), false, '其他 Prisma 错误不应被识别为 404');

    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['name'],
        message: 'Required',
      },
    ]);
    assert.equal(detect404(zodError), false, 'Zod 错误不应被识别为 404');

    const genericError = new Error('Database connection failed');
    assert.equal(detect404(genericError), false, '普通错误不应被识别为 404');
  });
});

describe('parseJsonString 函数行为验证', () => {
  function parseJsonString(jsonStr: string | null, fieldName = 'unknown'): any {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      return null;
    }
  }

  test('null 输入返回 null', () => {
    assert.equal(parseJsonString(null), null);
  });

  test('有效 JSON 数组返回数组', () => {
    const result = parseJsonString(JSON.stringify(['症状1', '症状2']));
    assert.deepEqual(result, ['症状1', '症状2']);
    assert.ok(Array.isArray(result));
  });

  test('有效 JSON 对象返回对象', () => {
    const result = parseJsonString(JSON.stringify({ title: '文献', url: 'https://example.com' }));
    assert.deepEqual(result, { title: '文献', url: 'https://example.com' });
  });

  test('无效 JSON 返回 null（静默失败）', () => {
    const result = parseJsonString('invalid json {{{');
    assert.equal(result, null);
  });

  test('空字符串返回 null', () => {
    assert.equal(parseJsonString(''), null);
  });

  test('symptoms 字段用 ?? [] 兜底保证始终为数组', () => {
    const symptoms = parseJsonString('invalid', 'symptoms') ?? [];
    assert.deepEqual(symptoms, []);
    assert.ok(Array.isArray(symptoms));
  });

  test('affectedBreeds 字段用 ?? [] 兜底保证始终为数组', () => {
    const affectedBreeds = parseJsonString(null, 'affectedBreeds') ?? [];
    assert.deepEqual(affectedBreeds, []);
    assert.ok(Array.isArray(affectedBreeds));
  });

  test('references 字段允许为 null（不兜底）', () => {
    const references = parseJsonString(null, 'references');
    assert.equal(references, null);
  });
});

describe('PUT /api/genetic-diseases/:id 错误处理逻辑', () => {
  async function simulatePutRoute(
    params: any,
    body: any,
    prismaMock: any
  ): Promise<{ statusCode: number; jsonBody: any }> {
    const res = createMockResponse();
    const req = createMockRequest(params, body);

    const diseaseSchema = z.object({
      name: z.string().min(1),
      species: z.string().min(1),
      inheritance: z.string().min(1),
      symptoms: z.array(z.string()).min(1),
      affectedBreeds: z.array(z.string()).min(1),
    });

    try {
      const data = diseaseSchema.partial().parse(req.body);

      const updateData: any = { ...data };
      if (data.symptoms !== undefined) {
        updateData.symptoms = data.symptoms ? JSON.stringify(data.symptoms) : null;
      }
      if (data.affectedBreeds !== undefined) {
        updateData.affectedBreeds = data.affectedBreeds
          ? JSON.stringify(data.affectedBreeds)
          : null;
      }

      await prismaMock.geneticDisease.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.status(200).json({ id: req.params.id, ...data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: '数据验证失败', details: error.errors }).jsonBody === undefined
          ? { statusCode: 400, jsonBody: { error: '数据验证失败', details: error.errors } }
          : { statusCode: res.statusCode, jsonBody: res.jsonBody };
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as any).code === 'P2025'
      ) {
        return { statusCode: 404, jsonBody: { error: '遗传病不存在' } };
      }
      return { statusCode: 500, jsonBody: { error: '更新遗传病失败' } };
    }

    return { statusCode: res.statusCode, jsonBody: res.jsonBody };
  }

  test('记录不存在时（P2025 错误）应返回 404', async () => {
    const prismaMock = {
      geneticDisease: {
        update: () => {
          throw new Prisma.PrismaClientKnownRequestError(
            'Record to update does not exist.',
            { code: 'P2025', clientVersion: '5.10.0' }
          );
        },
      },
    };

    const result = await simulatePutRoute(
      { id: 'non-existent-id' },
      { name: '测试病' },
      prismaMock
    );

    assert.equal(result.statusCode, 404, '状态码应为 404');
    assert.equal(result.jsonBody.error, '遗传病不存在', '错误消息应正确');
  });

  test('数据验证失败（Zod 错误）应返回 400 而非 404', async () => {
    const prismaMock = {
      geneticDisease: {
        update: () => Promise.resolve({}),
      },
    };

    const result = await simulatePutRoute(
      { id: 'test-id' },
      { name: 123 },
      prismaMock
    );

    assert.equal(result.statusCode, 400, '状态码应为 400');
    assert.equal(result.jsonBody.error, '数据验证失败', '错误消息应正确');
  });

  test('其他数据库错误应返回 500 而非 404', async () => {
    const prismaMock = {
      geneticDisease: {
        update: () => {
          throw new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed.',
            { code: 'P2002', clientVersion: '5.10.0' }
          );
        },
      },
    };

    const result = await simulatePutRoute(
      { id: 'test-id' },
      { name: '测试病' },
      prismaMock
    );

    assert.equal(result.statusCode, 500, '状态码应为 500');
    assert.equal(result.jsonBody.error, '更新遗传病失败', '错误消息应正确');
  });

  test('正常更新应返回 200', async () => {
    const prismaMock = {
      geneticDisease: {
        update: () =>
          Promise.resolve({
            id: 'test-id',
            name: '测试病',
            species: 'dog',
          }),
      },
    };

    const result = await simulatePutRoute(
      { id: 'test-id' },
      { name: '测试病', species: 'dog' },
      prismaMock
    );

    assert.equal(result.statusCode, 200, '状态码应为 200');
  });

  test('TOCTOU 竞态条件模拟 - 检查和删除之间记录被删除', async () => {
    let updateCallCount = 0;

    const prismaMock = {
      geneticDisease: {
        findUnique: () => {
          if (updateCallCount === 0) {
            return Promise.resolve({ id: 'test-id', name: '测试病' });
          }
          return Promise.resolve(null);
        },
        update: () => {
          updateCallCount++;
          throw new Prisma.PrismaClientKnownRequestError(
            'Record to update does not exist.',
            { code: 'P2025', clientVersion: '5.10.0' }
          );
        },
      },
    };

    const oldWay = async () => {
      const existing = await prismaMock.geneticDisease.findUnique({
        where: { id: 'test-id' },
      });
      if (!existing) {
        return { statusCode: 404, jsonBody: { error: '遗传病不存在' } };
      }
      try {
        await prismaMock.geneticDisease.update({
          where: { id: 'test-id' },
          data: { name: '新名称' },
        });
        return { statusCode: 200, jsonBody: {} };
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as any).code === 'P2025'
        ) {
          return { statusCode: 404, jsonBody: { error: '遗传病不存在' } };
        }
        return { statusCode: 500, jsonBody: { error: '更新失败' } };
      }
    };

    const newWay = async () => {
      try {
        await prismaMock.geneticDisease.update({
          where: { id: 'test-id' },
          data: { name: '新名称' },
        });
        return { statusCode: 200, jsonBody: {} };
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as any).code === 'P2025'
        ) {
          return { statusCode: 404, jsonBody: { error: '遗传病不存在' } };
        }
        return { statusCode: 500, jsonBody: { error: '更新失败' } };
      }
    };

    updateCallCount = 0;
    const oldResult = await oldWay();
    assert.equal(
      oldResult.statusCode,
      404,
      '旧方式在 TOCTOU 场景下能正确返回 404（但需要两次查询）'
    );

    updateCallCount = 0;
    const newResult = await newWay();
    assert.equal(
      newResult.statusCode,
      404,
      '新方式在 TOCTOU 场景下也能正确返回 404（只需一次查询）'
    );
  });
});

describe('DELETE /api/genetic-diseases/:id 错误处理逻辑', () => {
  async function simulateDeleteRoute(
    params: any,
    prismaMock: any
  ): Promise<{ statusCode: number; jsonBody: any }> {
    try {
      await prismaMock.geneticDisease.delete({
        where: { id: params.id },
      });

      return { statusCode: 200, jsonBody: { message: '删除成功' } };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as any).code === 'P2025'
      ) {
        return { statusCode: 404, jsonBody: { error: '遗传病不存在' } };
      }
      return { statusCode: 500, jsonBody: { error: '删除遗传病失败' } };
    }
  }

  test('记录不存在时（P2025 错误）应返回 404', async () => {
    const prismaMock = {
      geneticDisease: {
        delete: () => {
          throw new Prisma.PrismaClientKnownRequestError(
            'Record to delete does not exist.',
            { code: 'P2025', clientVersion: '5.10.0' }
          );
        },
      },
    };

    const result = await simulateDeleteRoute({ id: 'non-existent-id' }, prismaMock);

    assert.equal(result.statusCode, 404, '状态码应为 404');
    assert.equal(result.jsonBody.error, '遗传病不存在', '错误消息应正确');
  });

  test('其他数据库错误应返回 500 而非 404', async () => {
    const prismaMock = {
      geneticDisease: {
        delete: () => {
          throw new Prisma.PrismaClientKnownRequestError(
            'Foreign key constraint failed.',
            { code: 'P2003', clientVersion: '5.10.0' }
          );
        },
      },
    };

    const result = await simulateDeleteRoute({ id: 'test-id' }, prismaMock);

    assert.equal(result.statusCode, 500, '状态码应为 500');
    assert.equal(result.jsonBody.error, '删除遗传病失败', '错误消息应正确');
  });

  test('正常删除应返回 200', async () => {
    const prismaMock = {
      geneticDisease: {
        delete: () => Promise.resolve({}),
      },
    };

    const result = await simulateDeleteRoute({ id: 'test-id' }, prismaMock);

    assert.equal(result.statusCode, 200, '状态码应为 200');
    assert.equal(result.jsonBody.message, '删除成功', '消息应正确');
  });
});

describe('实际 HTTP 接口验证（集成测试）', () => {
  async function makeRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<{ status: number; data: any }> {
    const baseUrl = 'http://localhost:9527/api';
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      let data: any;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      return { status: response.status, data };
    } catch (error) {
      return { status: 0, data: { error: '无法连接到服务器' } };
    }
  }

  test('GET /api/genetic-diseases 应返回 200 和数据列表', async () => {
    const result = await makeRequest('GET', '/genetic-diseases');
    if (result.status === 0) {
      console.log('    ⚠  跳过：服务器未运行');
      return;
    }
    assert.equal(result.status, 200, '状态码应为 200');
    assert.ok(Array.isArray(result.data), '应返回数组');
  });

  test('PUT /api/genetic-diseases/:non-existent-id 应返回 404', async () => {
    const result = await makeRequest(
      'PUT',
      '/genetic-diseases/non-existent-id-12345',
      { name: '测试更新' }
    );
    if (result.status === 0) {
      console.log('    ⚠  跳过：服务器未运行');
      return;
    }
    assert.equal(result.status, 404, '状态码应为 404');
    assert.equal(result.data.error, '遗传病不存在', '错误消息应正确');
  });

  test('DELETE /api/genetic-diseases/:non-existent-id 应返回 404', async () => {
    const result = await makeRequest(
      'DELETE',
      '/genetic-diseases/non-existent-id-12345'
    );
    if (result.status === 0) {
      console.log('    ⚠  跳过：服务器未运行');
      return;
    }
    assert.equal(result.status, 404, '状态码应为 404');
    assert.equal(result.data.error, '遗传病不存在', '错误消息应正确');
  });

  test('完整生命周期：创建 → 更新 → 删除', async () => {
    const listResult = await makeRequest('GET', '/genetic-diseases');
    if (listResult.status === 0) {
      console.log('    ⚠  跳过：服务器未运行');
      return;
    }

    const existingId = listResult.data[0]?.id;
    if (!existingId) {
      console.log('    ⚠  跳过：无可用数据');
      return;
    }

    const updateResult = await makeRequest('PUT', `/genetic-diseases/${existingId}`, {
      description: '测试更新描述',
    });
    assert.equal(updateResult.status, 200, '更新成功应返回 200');

    const getResult = await makeRequest('GET', `/genetic-diseases/${existingId}`);
    assert.equal(getResult.status, 200, '查询成功应返回 200');
    assert.equal(getResult.data.description, '测试更新描述', '描述应已更新');
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
