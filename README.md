# @kasifraza/nestjs-redis-cache

[![npm version](https://img.shields.io/npm/v/@kasifraza/nestjs-redis-cache.svg)](https://www.npmjs.com/package/@kasifraza/nestjs-redis-cache)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Decorator-based Redis caching for NestJS with auto-invalidation and TTL.

## Installation

```bash
npm install @kasifraza/nestjs-redis-cache ioredis
```

## Usage

### Module Registration

```typescript
import { CacheModule } from '@kasifraza/nestjs-redis-cache';

@Module({
  imports: [
    CacheModule.register({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'app:',
    }),
  ],
})
export class AppModule {}
```

### @Cacheable Decorator

```typescript
import { Cacheable } from '@kasifraza/nestjs-redis-cache';

class UserService {
  @Cacheable({ key: 'users', ttl: 300 })
  async getUsers() {
    return this.userRepo.find();
  }
}
```

### @CacheInvalidate Decorator

```typescript
import { CacheInvalidate } from '@kasifraza/nestjs-redis-cache';

class UserService {
  @CacheInvalidate({ key: 'users' })
  async createUser(dto: CreateUserDto) {
    return this.userRepo.save(dto);
  }
}
```

### CacheService

```typescript
import { CacheService } from '@kasifraza/nestjs-redis-cache';

@Injectable()
class MyService {
  constructor(private cache: CacheService) {}

  async example() {
    await this.cache.set('key', { data: 1 }, 60);
    const val = await this.cache.get('key');
    await this.cache.del('key');
    await this.cache.flush();
  }
}
```

## License

MIT
