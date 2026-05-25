import { CacheService, Cacheable, CacheInvalidate, _cacheServiceRef } from './index';

jest.mock('ioredis', () => {
  const store: Record<string, string> = {};
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => Promise.resolve(store[key] || null)),
    set: jest.fn((key: string, val: string) => { store[key] = val; return Promise.resolve('OK'); }),
    del: jest.fn((key: string) => { delete store[key]; return Promise.resolve(1); }),
    flushdb: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve('OK'); }),
  }));
});

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService({ host: 'localhost', port: 6379 });
  });

  it('should set and get a value', async () => {
    await service.set('foo', { bar: 1 });
    const result = await service.get('foo');
    expect(result).toEqual({ bar: 1 });
  });

  it('should delete a value', async () => {
    await service.set('foo', 'val');
    await service.del('foo');
    const result = await service.get('foo');
    expect(result).toBeNull();
  });

  it('should flush all', async () => {
    await service.set('a', 1);
    await service.flush();
    expect(await service.get('a')).toBeNull();
  });
});

describe('Decorators', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService({ host: 'localhost', port: 6379 });
  });

  it('@Cacheable caches method result', async () => {
    class Test {
      calls = 0;
      @Cacheable({ key: 'test-key', ttl: 60 })
      async getData() { this.calls++; return 'data'; }
    }
    const t = new Test();
    const r1 = await t.getData();
    const r2 = await t.getData();
    expect(r1).toBe('data');
    expect(r2).toBe('data');
    expect(t.calls).toBe(1);
  });

  it('@CacheInvalidate removes cached key', async () => {
    await service.set('inv-key', 'cached');
    class Test {
      @CacheInvalidate({ key: 'inv-key' })
      async update() { return 'done'; }
    }
    const t = new Test();
    await t.update();
    expect(await service.get('inv-key')).toBeNull();
  });
});
