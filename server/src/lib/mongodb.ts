import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

const uri = env.MONGODB_URI;
let client: MongoClient;

/**
 * Singleton client for MongoDB connection management.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log('--- MongoDB Connected ---');
  }
  return client;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db();
}
