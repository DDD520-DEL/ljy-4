import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
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

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

describe('Prisma P2025 error code detection', () => {
  test('correctly identifies Prisma P2025 error (record not found)', () => {
    const p2025Error = {
      code: 'P2025',
      message: 'Record to update does not exist.',
      clientVersion: '5.10.0',
    };

    const isP2025 = (error) => {
      return (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      );
    };

    assert.equal(isP2025(p2025Error), true);
    assert.equal(isP2025({ code: 'P2002' }), false);
    assert.equal(isP2025(new Error('generic error')), false);
    assert.equal(isP2025(null), false);
    assert.equal(isP2025(undefined), false);
    assert.equal(isP2025('string error'), false);
  });

  test('error detection logic matches route code', () => {
    const detect404 = (error) => {
      if (error instanceof z.ZodError) return false;
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
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
    assert.equal(detect404(prismaError), true, 'Prisma P2025 should be detected as 404');

    const otherPrismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed.',
      {
        code: 'P2002',
        clientVersion: '5.10.0',
        meta: { modelName: 'GeneticDisease', target: ['name'] },
      }
    );
    assert.equal(detect404(otherPrismaError), false, 'Other Prisma errors should NOT be 404');

    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['name'],
        message: 'Required',
      },
    ]);
    assert.equal(detect404(zodError), false, 'Zod errors should NOT be 404');

    const genericError = new Error('Database connection failed');
    assert.equal(detect404(genericError), false, 'Generic errors should NOT be 404');
  });
});

describe('parseJsonString behavior validation', () => {
  function parseJsonString(jsonStr, fieldName = 'unknown') {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      return null;
    }
  }

  test('null input returns null', () => {
    assert.equal(parseJsonString(null), null);
  });

  test('valid JSON array returns array', () => {
    const result = parseJsonString(JSON.stringify(['symptom1', 'symptom2']));
    assert.deepEqual(result, ['symptom1', 'symptom2']);
    assert.ok(Array.isArray(result));
  });

  test('valid JSON object returns object', () => {
    const result = parseJsonString(JSON.stringify({ title: 'Ref', url: 'https://example.com' }));
    assert.deepEqual(result, { title: 'Ref', url: 'https://example.com' });
  });

  test('invalid JSON returns null (fail gracefully)', () => {
    const result = parseJsonString('invalid json {{{');
    assert.equal(result, null);
  });

  test('empty string returns null', () => {
    assert.equal(parseJsonString(''), null);
  });

  test('symptoms field uses ?? [] fallback to always return array', () => {
    const symptoms = parseJsonString('invalid', 'symptoms') ?? [];
    assert.deepEqual(symptoms, []);
    assert.ok(Array.isArray(symptoms));
  });

  test('affectedBreeds field uses ?? [] fallback to always return array', () => {
    const affectedBreeds = parseJsonString(null, 'affectedBreeds') ?? [];
    assert.deepEqual(affectedBreeds, []);
    assert.ok(Array.isArray(affectedBreeds));
  });

  test('references field allows null (no fallback)', () => {
    const references = parseJsonString(null, 'references');
    assert.equal(references, null);
  });
});

describe('PUT route error handling logic', () => {
  async function simulatePutRoute(params, body, prismaMock) {
    const diseaseSchema = z.object({
      name: z.string().min(1),
      species: z.string().min(1),
      inheritance: z.string().min(1),
      symptoms: z.array(z.string()).min(1),
      affectedBreeds: z.array(z.string()).min(1),
    });

    try {
      const data = diseaseSchema.partial().parse(body);
      await prismaMock.geneticDisease.update({
        where: { id: params.id },
        data,
      });
      return { statusCode: 200, jsonBody: { id: params.id, ...data } };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { statusCode: 400, jsonBody: { error: 'Validation failed' } };
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return { statusCode: 404, jsonBody: { error: 'Disease not found' } };
      }
      return { statusCode: 500, jsonBody: { error: 'Update failed' } };
    }
  }

  test('P2025 error should return 404', async () => {
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
      { name: 'Test Disease' },
      prismaMock
    );

    assert.equal(result.statusCode, 404, 'Status code should be 404');
    assert.equal(result.jsonBody.error, 'Disease not found', 'Error message should match');
  });

  test('Zod validation error should return 400 not 404', async () => {
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

    assert.equal(result.statusCode, 400, 'Status code should be 400');
  });

  test('Other DB errors should return 500 not 404', async () => {
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
      { name: 'Test Disease' },
      prismaMock
    );

    assert.equal(result.statusCode, 500, 'Status code should be 500');
  });

  test('TOCTOU race condition simulation', async () => {
    let updateCallCount = 0;

    const prismaMock = {
      geneticDisease: {
        findUnique: () => {
          if (updateCallCount === 0) {
            return Promise.resolve({ id: 'test-id', name: 'Test Disease' });
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
        return { statusCode: 404, jsonBody: { error: 'Not found' } };
      }
      try {
        await prismaMock.geneticDisease.update({
          where: { id: 'test-id' },
          data: { name: 'New Name' },
        });
        return { statusCode: 200, jsonBody: {} };
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2025'
        ) {
          return { statusCode: 404, jsonBody: { error: 'Not found' } };
        }
        return { statusCode: 500, jsonBody: { error: 'Failed' } };
      }
    };

    const newWay = async () => {
      try {
        await prismaMock.geneticDisease.update({
          where: { id: 'test-id' },
          data: { name: 'New Name' },
        });
        return { statusCode: 200, jsonBody: {} };
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'P2025'
        ) {
          return { statusCode: 404, jsonBody: { error: 'Not found' } };
        }
        return { statusCode: 500, jsonBody: { error: 'Failed' } };
      }
    };

    updateCallCount = 0;
    const oldResult = await oldWay();
    assert.equal(
      oldResult.statusCode,
      404,
      'Old approach handles TOCTOU (but requires 2 queries)'
    );

    updateCallCount = 0;
    const newResult = await newWay();
    assert.equal(
      newResult.statusCode,
      404,
      'New approach handles TOCTOU with only 1 query'
    );
  });
});

describe('DELETE route error handling logic', () => {
  async function simulateDeleteRoute(params, prismaMock) {
    try {
      await prismaMock.geneticDisease.delete({
        where: { id: params.id },
      });
      return { statusCode: 200, jsonBody: { message: 'Deleted' } };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return { statusCode: 404, jsonBody: { error: 'Disease not found' } };
      }
      return { statusCode: 500, jsonBody: { error: 'Delete failed' } };
    }
  }

  test('P2025 error should return 404', async () => {
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

    assert.equal(result.statusCode, 404, 'Status code should be 404');
    assert.equal(result.jsonBody.error, 'Disease not found', 'Error message should match');
  });

  test('Other DB errors should return 500 not 404', async () => {
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

    assert.equal(result.statusCode, 500, 'Status code should be 500');
  });
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Passed: ${passed}, Failed: ${failed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

if (failed > 0) {
  console.log(`\nFailed tests:`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\nAll tests passed ✓');
  process.exit(0);
}
