import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * Create mock TypeORM Repository with all common methods
 */
export const createMockRepository = <
  T extends ObjectLiteral = any,
>(): jest.Mocked<Partial<Repository<T>>> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn((entity) => entity as T) as any,
  save: jest.fn((entity) => Promise.resolve(entity as T)) as any,
  update: jest.fn(),
  remove: jest.fn((entity) => Promise.resolve(entity as T)) as any,
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => createMockQueryBuilder<T>()) as any,
  manager: {
    transaction: jest.fn((cb) => cb({})),
  } as any,
});

/**
 * Create mock TypeORM QueryBuilder
 */
export const createMockQueryBuilder = <
  T extends ObjectLiteral = any,
>(): jest.Mocked<Partial<SelectQueryBuilder<T>>> => {
  const queryBuilder: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  return queryBuilder;
};

/**
 * Create mock for service dependencies
 */
export const createMockService = <T extends Record<string, any>>(
  methods: (keyof T)[],
): jest.Mocked<Partial<T>> => {
  const mock: any = {};
  methods.forEach((method) => {
    mock[method] = jest.fn();
  });
  return mock;
};
