/**
 * Conversation repository — all MongoDB operations for chat conversations.
 *
 * Responsibilities:
 *  - Ensure indexes exist (auto-create on first use)
 *  - Get or create a conversation for a user
 *  - Append messages to a conversation (with 200-message cap)
 *  - Retrieve the latest conversation for a user
 *  - Clear messages from a conversation
 */

import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongodb.js';
import type { ConversationDocument, IMessage } from '../types/chat.types.js';

const COLLECTION_NAME = 'conversations';
const MAX_MESSAGES = 200;

let indexesReady = false;

// ---------------------------------------------------------------------------
// Index bootstrap
// ---------------------------------------------------------------------------

/**
 * Ensures MongoDB indexes exist on the conversations collection.
 * Called lazily on first use.
 */
async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;

  const db = await getDb();
  const col = db.collection<ConversationDocument>(COLLECTION_NAME);

  await col.createIndex({ userId: 1 });
  await col.createIndex({ userId: 1, updatedAt: -1 });

  indexesReady = true;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Returns the most recently updated conversation for the user, or null.
 */
export async function getLatestConversation(
  userId: string,
): Promise<ConversationDocument | null> {
  await ensureIndexes();
  const db = await getDb();
  const col = db.collection<ConversationDocument>(COLLECTION_NAME);

  return col.findOne({ userId }, { sort: { updatedAt: -1 } });
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Finds the most recent conversation for the user, or creates a new one
 * with an auto-generated title and empty messages array.
 */
export async function getOrCreateConversation(
  userId: string,
): Promise<ConversationDocument> {
  await ensureIndexes();

  const existing = await getLatestConversation(userId);
  if (existing) return existing;

  const db = await getDb();
  const col = db.collection<ConversationDocument>(COLLECTION_NAME);

  const now = new Date();
  const doc: Omit<ConversationDocument, '_id'> = {
    userId,
    title: 'New Conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await col.insertOne(doc as ConversationDocument);

  return { ...doc, _id: result.insertedId };
}

/**
 * Pushes both messages to the conversation's messages array and updates
 * `updatedAt`. If the array already has 198+ entries, the oldest messages
 * are truncated so the total stays at or below 200 after appending.
 */
export async function appendMessages(
  conversationId: ObjectId,
  userMsg: IMessage,
  assistantMsg: IMessage,
): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const col = db.collection<ConversationDocument>(COLLECTION_NAME);

  // Fetch current message count to decide whether truncation is needed
  const conversation = await col.findOne(
    { _id: conversationId },
    { projection: { 'messages': 1 } },
  );

  if (!conversation) return;

  const currentCount = conversation.messages.length;
  const now = new Date();

  if (currentCount >= MAX_MESSAGES - 1) {
    // Slice to keep only the most recent (MAX_MESSAGES - 2) messages,
    // then append both new messages to land at exactly MAX_MESSAGES.
    const keepFrom = currentCount - (MAX_MESSAGES - 2);
    const trimmedMessages = conversation.messages.slice(keepFrom);
    trimmedMessages.push(userMsg, assistantMsg);

    await col.updateOne(
      { _id: conversationId },
      { $set: { messages: trimmedMessages, updatedAt: now } },
    );
  } else {
    await col.updateOne(
      { _id: conversationId },
      {
        $push: { messages: { $each: [userMsg, assistantMsg] } },
        $set: { updatedAt: now },
      },
    );
  }
}

/**
 * Sets the messages array to [] and updates `updatedAt` on the user's
 * most recent conversation.
 */
export async function clearConversationMessages(userId: string): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const col = db.collection<ConversationDocument>(COLLECTION_NAME);

  await col.findOneAndUpdate(
    { userId },
    { $set: { messages: [], updatedAt: new Date() } },
    { sort: { updatedAt: -1 } },
  );
}
