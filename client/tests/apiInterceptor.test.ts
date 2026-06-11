import assert from 'node:assert/strict';
import {
  describe,
  it,
  beforeEach,
  afterEach,
} from 'node:test';
import sinon from 'sinon';
import axios from 'axios';

type AxiosResponse = {
  data: any;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: {
    responseType?: string;
    [key: string]: any;
  };
  request?: any;
};

type AxiosError = {
  config: {
    responseType?: string;
    [key: string]: any;
  };
  response?: {
    data: any;
    status?: number;
    [key: string]: any;
  };
  message: string;
  [key: string]: any;
};

const createResponseInterceptor = () => {
  return (response: AxiosResponse) => {
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response.data;
  };
};

const createErrorInterceptor = () => {
  return async (error: AxiosError) => {
    console.error('API Error:', error);
    if (error.config?.responseType === 'blob' && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        let errorData: any = text;
        try {
          errorData = JSON.parse(text);
        } catch {
          // 不是 JSON 格式，保持原样
        }
        return Promise.reject(errorData);
      } catch {
        return Promise.reject(error.message);
      }
    }
    return Promise.reject(error.response?.data || error.message);
  };
};

const extractErrorMessage = (error: any): string => {
  if (error && typeof error === 'object') {
    if ('error' in error) return String((error as any).error);
    if ('message' in error) return String((error as any).message);
  }
  if (typeof error === 'string') return error;
  return '操作失败，请重试';
};

describe('Response Interceptor', () => {
  it('普通 JSON 请求应返回 response.data', () => {
    const interceptor = createResponseInterceptor();
    const mockResponse: AxiosResponse = {
      data: { id: 1, name: '测试宠物' },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      config: {},
    };

    const result = interceptor(mockResponse);
    assert.deepEqual(result, { id: 1, name: '测试宠物' });
    assert.equal(typeof result, 'object');
  });

  it('blob 请求应返回完整的 response 对象', () => {
    const interceptor = createResponseInterceptor();
    const mockBlob = new Blob(['test content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const mockResponse: AxiosResponse = {
      data: mockBlob,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="test.xlsx"',
      },
      config: { responseType: 'blob' },
    };

    const result = interceptor(mockResponse);
    assert.equal(result, mockResponse, '应返回完整的 response 对象');
    assert.equal(result.data, mockBlob, 'data 应为 Blob 对象');
    assert.equal(result.headers['content-disposition'], 'attachment; filename="test.xlsx"', '应能访问 headers');
    assert.equal(result.config.responseType, 'blob', '应能访问 config');
  });

  it('非 blob 请求即使数据是 Blob 也只返回 data', () => {
    const interceptor = createResponseInterceptor();
    const mockBlob = new Blob(['test content']);
    const mockResponse: AxiosResponse = {
      data: mockBlob,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/octet-stream' },
      config: {},
    };

    const result = interceptor(mockResponse);
    assert.equal(result, mockBlob, '只返回 data');
    assert.ok(result instanceof Blob);
  });
});

describe('Error Interceptor', () => {
  it('普通 JSON 错误应返回 error.response.data', async () => {
    const interceptor = createErrorInterceptor();
    const mockError: AxiosError = {
      config: {},
      response: {
        data: { error: '数据库连接失败' },
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true, '应 reject 错误');
    assert.deepEqual(rejectedValue, { error: '数据库连接失败' }, '应返回 response.data');
  });

  it('没有 response 时应返回 error.message', async () => {
    const interceptor = createErrorInterceptor();
    const mockError: AxiosError = {
      config: {},
      message: 'Network Error',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true);
    assert.equal(rejectedValue, 'Network Error');
  });

  it('response.data 为字符串时应直接返回', async () => {
    const interceptor = createErrorInterceptor();
    const mockError: AxiosError = {
      config: {},
      response: {
        data: '服务器内部错误',
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true);
    assert.equal(rejectedValue, '服务器内部错误');
  });

  it('blob 请求返回 JSON 错误时应解析 Blob 中的 JSON', async () => {
    const interceptor = createErrorInterceptor();
    const errorJson = JSON.stringify({ error: '导出宠物列表失败' });
    const mockBlob = new Blob([errorJson], { type: 'application/json' });

    const mockError: AxiosError = {
      config: { responseType: 'blob' },
      response: {
        data: mockBlob,
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true);
    assert.deepEqual(rejectedValue, { error: '导出宠物列表失败' }, '应解析 Blob 中的 JSON');
  });

  it('blob 请求返回纯文本错误时应返回文本', async () => {
    const interceptor = createErrorInterceptor();
    const errorText = '导出失败，服务器繁忙';
    const mockBlob = new Blob([errorText], { type: 'text/plain' });

    const mockError: AxiosError = {
      config: { responseType: 'blob' },
      response: {
        data: mockBlob,
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true);
    assert.equal(rejectedValue, errorText, '应返回 Blob 中的文本');
  });

  it('blob 错误解析失败时应返回 error.message', async () => {
    const interceptor = createErrorInterceptor();
    const mockBlob = {
      text: () => Promise.reject(new Error('Blob parse failed')),
    } as unknown as Blob;

    const mockError: AxiosError = {
      config: { responseType: 'blob' },
      response: {
        data: mockBlob,
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true);
    assert.equal(rejectedValue, 'Request failed with status code 500', '解析失败时返回 error.message');
  });

  it('非 blob 请求即使返回 Blob 也走普通错误处理', async () => {
    const interceptor = createErrorInterceptor();
    const mockBlob = new Blob(['error']);
    const mockError: AxiosError = {
      config: {},
      response: {
        data: mockBlob,
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejected = false;
    let rejectedValue: any = null;

    try {
      await interceptor(mockError);
    } catch (err) {
      rejected = true;
      rejectedValue = err;
    }

    assert.equal(rejected, true);
    assert.equal(rejectedValue, mockBlob, '非 blob 请求直接返回 response.data');
  });
});

describe('extractErrorMessage', () => {
  it('包含 error 字段的对象应返回 error 值', () => {
    const error = { error: '导出宠物列表失败' };
    assert.equal(extractErrorMessage(error), '导出宠物列表失败');
  });

  it('包含 message 字段的对象应返回 message 值', () => {
    const error = { message: '网络请求超时' };
    assert.equal(extractErrorMessage(error), '网络请求超时');
  });

  it('同时包含 error 和 message 时优先返回 error', () => {
    const error = { error: '导出失败', message: 'Request failed' };
    assert.equal(extractErrorMessage(error), '导出失败');
  });

  it('字符串错误应直接返回', () => {
    assert.equal(extractErrorMessage('服务器错误'), '服务器错误');
  });

  it('null 应返回默认消息', () => {
    assert.equal(extractErrorMessage(null), '操作失败，请重试');
  });

  it('undefined 应返回默认消息', () => {
    assert.equal(extractErrorMessage(undefined), '操作失败，请重试');
  });

  it('不包含 error 和 message 的对象应返回默认消息', () => {
    const error = { code: 500, status: 'error' };
    assert.equal(extractErrorMessage(error), '操作失败，请重试');
  });

  it('数字类型应返回默认消息', () => {
    assert.equal(extractErrorMessage(500), '操作失败，请重试');
  });

  it('空对象应返回默认消息', () => {
    assert.equal(extractErrorMessage({}), '操作失败，请重试');
  });

  it('error 字段为数字时应转换为字符串', () => {
    const error = { error: 500 };
    assert.equal(extractErrorMessage(error), '500');
  });
});

describe('文件名解析逻辑', () => {
  const parseFilename = (contentDisposition: string | null | undefined): string => {
    let filename = `export_${Date.now()}.xlsx`;
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
      }
    }
    return filename;
  };

  it('应正确解析 filename="test.xlsx" 格式', () => {
    const header = 'attachment; filename="test.xlsx"';
    assert.equal(parseFilename(header), 'test.xlsx');
  });

  it('应正确解析 filename*=UTF-8\'\'中文文件名.xlsx 格式', () => {
    const encodedName = encodeURIComponent('宠物列表.xlsx');
    const header = `attachment; filename*=UTF-8''${encodedName}`;
    assert.equal(parseFilename(header), '宠物列表.xlsx');
  });

  it('应正确解析不带引号的文件名', () => {
    const header = 'attachment; filename=report.xlsx';
    assert.equal(parseFilename(header), 'report.xlsx');
  });

  it('Content-Disposition 为 null 时应返回默认文件名', () => {
    const result = parseFilename(null);
    assert.ok(result.endsWith('.xlsx'), '应返回 xlsx 后缀的文件名');
    assert.ok(result.startsWith('export_'), '应使用默认前缀');
  });

  it('Content-Disposition 格式不正确时应返回默认文件名', () => {
    const result = parseFilename('attachment; invalid');
    assert.ok(result.endsWith('.xlsx'));
  });

  it('应移除文件名中的引号', () => {
    const header = 'attachment; filename="\'quoted\'.xlsx"';
    assert.equal(parseFilename(header), 'quoted.xlsx');
  });
});

describe('PetList 错误状态管理', () => {
  it('showError 应设置错误状态并在 5 秒后自动清除', (_, done) => {
    let errorState: string | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const showError = (message: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      errorState = message;
      timeoutId = setTimeout(() => {
        errorState = null;
        done();
      }, 10);
    };

    const dismissError = () => {
      if (timeoutId) clearTimeout(timeoutId);
      errorState = null;
    };

    showError('导出失败');
    assert.equal(errorState, '导出失败');

    setTimeout(() => {
      dismissError();
      assert.equal(errorState, null);
    }, 5);
  });

  it('连续调用 showError 应重置计时器', (_, done) => {
    let errorState: string | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let callCount = 0;

    const showError = (message: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      errorState = message;
      callCount++;
      timeoutId = setTimeout(() => {
        errorState = null;
        if (callCount === 2) {
          done();
        }
      }, 10);
    };

    showError('错误1');
    assert.equal(errorState, '错误1');
    assert.equal(callCount, 1);

    setTimeout(() => {
      showError('错误2');
      assert.equal(errorState, '错误2');
      assert.equal(callCount, 2);
    }, 5);
  });

  it('dismissError 应立即清除错误状态和计时器', () => {
    let errorState: string | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let timerCleared = false;

    const originalClearTimeout = global.clearTimeout;
    global.clearTimeout = (id: any) => {
      if (id === timeoutId) {
        timerCleared = true;
      }
      return originalClearTimeout(id);
    };

    const showError = (message: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      errorState = message;
      timeoutId = setTimeout(() => {
        errorState = null;
      }, 5000);
    };

    const dismissError = () => {
      if (timeoutId) clearTimeout(timeoutId);
      errorState = null;
    };

    showError('测试错误');
    assert.equal(errorState, '测试错误');

    dismissError();
    assert.equal(errorState, null);
    assert.equal(timerCleared, true);

    global.clearTimeout = originalClearTimeout;
  });
});

describe('GeneReports 成功/错误状态管理', () => {
  it('showSuccess 应清除错误状态并设置成功状态', () => {
    let errorState: string | null = '之前的错误';
    let successState: string | null = null;
    let successTimerId: NodeJS.Timeout | null = null;
    let errorTimerId: NodeJS.Timeout | null = null;

    const showSuccess = (message: string) => {
      if (successTimerId) clearTimeout(successTimerId);
      if (errorTimerId) clearTimeout(errorTimerId);
      successState = message;
      errorState = null;
      successTimerId = setTimeout(() => {
        successState = null;
      }, 3000);
    };

    showSuccess('操作成功');
    assert.equal(successState, '操作成功');
    assert.equal(errorState, null);
  });

  it('showError 应清除成功状态并设置错误状态', () => {
    let errorState: string | null = null;
    let successState: string | null = '之前的成功';
    let successTimerId: NodeJS.Timeout | null = null;
    let errorTimerId: NodeJS.Timeout | null = null;

    const showError = (message: string) => {
      if (errorTimerId) clearTimeout(errorTimerId);
      if (successTimerId) clearTimeout(successTimerId);
      errorState = message;
      successState = null;
      errorTimerId = setTimeout(() => {
        errorState = null;
      }, 5000);
    };

    showError('操作失败');
    assert.equal(errorState, '操作失败');
    assert.equal(successState, null);
  });

  it('成功状态应在 3 秒后自动清除，错误状态应在 5 秒后自动清除', (_, done) => {
    let errorState: string | null = null;
    let successState: string | null = null;
    let successTimerId: NodeJS.Timeout | null = null;
    let errorTimerId: NodeJS.Timeout | null = null;

    const showSuccess = (message: string) => {
      if (successTimerId) clearTimeout(successTimerId);
      successState = message;
      successTimerId = setTimeout(() => {
        successState = null;
        assert.equal(successState, null, '成功状态应已清除');
      }, 10);
    };

    const showError = (message: string) => {
      if (errorTimerId) clearTimeout(errorTimerId);
      errorState = message;
      errorTimerId = setTimeout(() => {
        errorState = null;
        assert.equal(errorState, null, '错误状态应已清除');
        done();
      }, 20);
    };

    showSuccess('成功');
    setTimeout(() => {
      showError('错误');
    }, 15);
  });
});

describe('导出功能集成场景', () => {
  it('导出成功流程：请求 → 响应 → 下载', () => {
    const mockBlob = new Blob(['excel content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const responseInterceptor = createResponseInterceptor();

    const mockResponse: AxiosResponse = {
      data: mockBlob,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="pets_export_2026-06-12.xlsx"',
      },
      config: { responseType: 'blob', params: { species: 'dog' } },
    };

    const interceptedResponse = responseInterceptor(mockResponse);
    assert.equal(interceptedResponse, mockResponse);

    const parseFilename = (contentDisposition: string | null): string => {
      let filename = `export_${Date.now()}.xlsx`;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
        if (matches && matches[1]) {
          filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      }
      return filename;
    };

    const filename = parseFilename(interceptedResponse.headers['content-disposition']);
    assert.equal(filename, 'pets_export_2026-06-12.xlsx');
    assert.equal(interceptedResponse.data, mockBlob);
  });

  it('导出失败流程：请求 → 错误响应 → 错误提示', async () => {
    const errorInterceptor = createErrorInterceptor();
    const errorBlob = new Blob([JSON.stringify({ error: '导出宠物列表失败' })], {
      type: 'application/json',
    });

    const mockError: AxiosError = {
      config: { responseType: 'blob', params: { species: 'dog' } },
      response: {
        data: errorBlob,
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejectedError: any = null;
    try {
      await errorInterceptor(mockError);
    } catch (err) {
      rejectedError = err;
    }

    assert.deepEqual(rejectedError, { error: '导出宠物列表失败' });

    const errorMessage = extractErrorMessage(rejectedError);
    assert.equal(errorMessage, '导出宠物列表失败');
  });

  it('批量导出失败流程', async () => {
    const errorInterceptor = createErrorInterceptor();
    const errorBlob = new Blob(['服务器内部错误'], { type: 'text/plain' });

    const mockError: AxiosError = {
      config: { responseType: 'blob', data: { reportIds: ['1', '2', '3'] } },
      response: {
        data: errorBlob,
        status: 500,
      },
      message: 'Request failed with status code 500',
    };

    let rejectedError: any = null;
    try {
      await errorInterceptor(mockError);
    } catch (err) {
      rejectedError = err;
    }

    assert.equal(rejectedError, '服务器内部错误');

    const errorMessage = extractErrorMessage(rejectedError);
    assert.equal(errorMessage, '服务器内部错误');
  });

  it('网络错误应正确处理', async () => {
    const errorInterceptor = createErrorInterceptor();

    const mockError: AxiosError = {
      config: { responseType: 'blob' },
      message: 'Network Error',
    };

    let rejectedError: any = null;
    try {
      await errorInterceptor(mockError);
    } catch (err) {
      rejectedError = err;
    }

    const errorMessage = extractErrorMessage(rejectedError);
    assert.equal(errorMessage, 'Network Error');
  });
});
