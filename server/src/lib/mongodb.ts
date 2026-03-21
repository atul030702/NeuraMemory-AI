import { Db, MongoClient } from 'mongodb';
import { env } from '../config/env.js';

const uri = env.MONGODB_URI;

// Store the in-flight promise, not the resolved client.
// This prevents a race condition where concurrent callers both pass the
// `if (!client)` guard before the first connection resolves, creating
// multiple MongoClient instances.
let clientPromise: Promise<MongoClient> | null = null;

/**
 * Singleton client for MongoDB connection management.
 * Uses a promise-based singleton to prevent concurrent connection leaks.
 */
export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const c = new MongoClient(uri);
    clientPromise = c.connect().then(() => {
      console.log('--- MongoDB Connected ---');
      return c;
    });
  }
  return clientPromise;
}

/**
 * Returns the default MongoDB database instance from the singleton client.
 */
export async function getDb(): Promise<Db> {
  const mongoClient = await getMongoClient();
  return mongoClient.db();
}
