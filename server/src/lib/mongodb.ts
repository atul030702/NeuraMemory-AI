import { Db, MongoClient } from 'mongodb';
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

/**
 * Returns the default MongoDB database instance from the singleton client.
 */
export async function getDb(): Promise<Db> {
  const mongoClient = await getMongoClient();
  return mongoClient.db();
}
