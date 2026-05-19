import IORedis from "ioredis";
import { config } from "../config.js";

/**
 * Один Redis-клиент на процесс. BullMQ требует разные подключения для очереди и worker'a,
 * поэтому экспортируем фабрику.
 */
export const createRedisConnection = () =>
  new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

let cached = null;
export const redis = (() => (cached ??= createRedisConnection()))();
