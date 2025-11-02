import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Create mock JwtService for authentication testing
 */
export const createMockJwtService = (): jest.Mocked<Partial<JwtService>> => ({
  sign: jest.fn((payload) => 'mock-jwt-token') as any,
  verify: jest.fn((token) => ({
    userId: 'test-user-1',
    username: 'testuser',
    sub: 'test-user-1',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })) as any,
  decode: jest.fn((token) => ({
    userId: 'test-user-1',
    username: 'testuser',
    sub: 'test-user-1',
  })) as any,
  signAsync: jest.fn((payload) => Promise.resolve('mock-jwt-token')) as any,
  verifyAsync: jest.fn((token) =>
    Promise.resolve({
      userId: 'test-user-1',
      username: 'testuser',
      sub: 'test-user-1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ) as any,
});

/**
 * Create mock ConfigService for configuration testing
 */
export const createMockConfigService = (): jest.Mocked<
  Partial<ConfigService>
> => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    const mockConfig: Record<string, any> = {
      JWT_SECRET: 'test-secret-key',
      JWT_EXPIRATION: '1h',
      JWT_REFRESH_EXPIRATION: '7d',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: 'test-password',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_DATABASE: 'test_db',
      DB_USERNAME: 'test_user',
      DB_PASSWORD: 'test_password',
      BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
      ETK_TOKEN_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      IDRS_TOKEN_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      MARKET_CONTRACT_ADDRESS: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      ENERGY_CONVERTER_ADDRESS: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      MQTT_BROKER_URL: 'mqtt://localhost:1883',
      ENCRYPTION_KEY: 'test-encryption-key-32-characters',
    };
    return mockConfig[key] ?? defaultValue;
  }),
  getOrThrow: jest.fn((key: string) => {
    const mockConfig: Record<string, any> = {
      JWT_SECRET: 'test-secret-key',
      BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
    };
    if (mockConfig[key]) {
      return mockConfig[key];
    }
    throw new Error(`Configuration key "${key}" not found`);
  }),
});

/**
 * Create mock Redis client for caching tests
 */
export const createMockRedisClient = (): jest.Mocked<Partial<Redis>> => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrevrange: jest.fn(),
  zrangebyscore: jest.fn(),
  zrem: jest.fn(),
  zcard: jest.fn(),
  zremrangebyrank: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  ping: jest.fn(() => Promise.resolve('PONG')) as any,
  quit: jest.fn(() => Promise.resolve('OK')),
  disconnect: jest.fn(),
});

/**
 * Create mock ethers Contract for blockchain testing
 */
export const createMockEthersContract = () => ({
  convertEnergyToETK: jest.fn(),
  mintETK: jest.fn(),
  burnETK: jest.fn(),
  balanceOf: jest.fn(),
  allowance: jest.fn(),
  approve: jest.fn(),
  transfer: jest.fn(),
  placeOrder: jest.fn(),
  cancelOrder: jest.fn(),
  getOrder: jest.fn(),
  getOpenOrders: jest.fn(),
  getMarketPrice: jest.fn(),
  getTotalETKSupplyInMarket: jest.fn(),
  getTotalIDRSSupplyInMarket: jest.fn(),
  buyOrders: jest.fn(),
  sellOrders: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  interface: {
    parseLog: jest.fn(),
  },
});

/**
 * Create mock ethers Wallet for signing transactions
 */
export const createMockEthersWallet = () => ({
  address: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
  privateKey:
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  signMessage: jest.fn(),
  signTransaction: jest.fn(),
  connect: jest.fn(),
  getAddress: jest.fn(() =>
    Promise.resolve('0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9'),
  ),
  getBalance: jest.fn(() => Promise.resolve(BigInt('1000000000000000000'))),
});

/**
 * Create mock ethers Provider
 */
export const createMockEthersProvider = () => ({
  getNetwork: jest.fn(() =>
    Promise.resolve({ chainId: 31337, name: 'localhost' }),
  ),
  getBlockNumber: jest.fn(() => Promise.resolve(12345)),
  getBalance: jest.fn(() => Promise.resolve(BigInt('1000000000000000000'))),
  getTransactionReceipt: jest.fn(() =>
    Promise.resolve({
      transactionHash: '0xabc123def456...',
      blockNumber: 12345,
      gasUsed: BigInt(150000),
      effectiveGasPrice: BigInt('20000000000'),
      status: 1,
    }),
  ),
  waitForTransaction: jest.fn(() =>
    Promise.resolve({
      transactionHash: '0xabc123def456...',
      blockNumber: 12345,
      gasUsed: BigInt(150000),
      status: 1,
    }),
  ),
});

/**
 * Create mock MQTT Client for IoT device communication
 */
export const createMockMqttClient = () => ({
  publish: jest.fn((topic, message, options, callback) => {
    if (callback) callback(null);
    return {} as any;
  }),
  subscribe: jest.fn((topic, options, callback) => {
    if (callback) callback(null, [{ topic, qos: 0 }]);
    return {} as any;
  }),
  unsubscribe: jest.fn((topic, options, callback) => {
    if (callback) callback(null);
    return {} as any;
  }),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  end: jest.fn((force, options, callback) => {
    if (callback) callback();
    return {} as any;
  }),
  connected: true,
});
