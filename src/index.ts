import 'reflect-metadata';
import { Module, DynamicModule, Injectable, Global } from '@nestjs/common';
import Redis from 'ioredis';

export interface CacheModuleOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

let cacheServiceRef: CacheService | null = null;

@Injectable()
export class CacheService {
  private redis: Redis;
  private prefix: string;

  constructor(options: CacheModuleOptions) {
    this.redis = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: options.db,
    });
    this.prefix = options.keyPrefix || '';
    cacheServiceRef = this;
  }

  private key(k: string): string {
    return this.prefix ? `${this.prefix}${k}` : k;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const val = await this.redis.get(this.key(key));
    return val ? JSON.parse(val) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const k = this.key(key);
    if (ttl) {
      await this.redis.set(k, JSON.stringify(value), 'EX', ttl);
    } else {
      await this.redis.set(k, JSON.stringify(value));
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.key(key));
  }

  async flush(): Promise<void> {
    await this.redis.flushdb();
  }
}

export function Cacheable(opts: { key: string; ttl?: number }): MethodDecorator {
  return (_target, _prop, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      if (!cacheServiceRef) return original.apply(this, args);
      const cached = await cacheServiceRef.get(opts.key);
      if (cached !== null) return cached;
      const result = await original.apply(this, args);
      await cacheServiceRef.set(opts.key, result, opts.ttl);
      return result;
    };
    return descriptor;
  };
}

export function CacheInvalidate(opts: { key: string }): MethodDecorator {
  return (_target, _prop, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await original.apply(this, args);
      if (cacheServiceRef) await cacheServiceRef.del(opts.key);
      return result;
    };
    return descriptor;
  };
}

const CACHE_OPTIONS = 'CACHE_MODULE_OPTIONS';

@Global()
@Module({})
export class CacheModule {
  static register(options: CacheModuleOptions): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        { provide: CACHE_OPTIONS, useValue: options },
        { provide: CacheService, useFactory: () => new CacheService(options) },
      ],
      exports: [CacheService],
    };
  }
}

export { cacheServiceRef as _cacheServiceRef };
