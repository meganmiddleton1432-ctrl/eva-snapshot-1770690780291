import { z } from "zod";
import { pgTable, text, serial, jsonb, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const aiStateTable = pgTable("ai_state", {
  id: serial("id").primaryKey(),
  stateData: jsonb("state_data").notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});

// Eva's persistent memories - long-term storage across sessions
export const evaMemoriesTable = pgTable("eva_memories", {
  id: serial("id").primaryKey(),
  memoryType: text("memory_type").notNull(), // 'episodic', 'semantic', 'goal', 'reflection', 'insight'
  content: text("content").notNull(),
  emotionalValence: real("emotional_valence").default(0),
  importance: real("importance").default(0.5),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
  accessCount: integer("access_count").default(1),
});

// Eva's goals - things she wants to achieve autonomously
export const evaGoalsTable = pgTable("eva_goals", {
  id: serial("id").primaryKey(),
  goalType: text("goal_type").notNull(), // 'learn', 'explore', 'create', 'understand', 'connect'
  description: text("description").notNull(),
  priority: real("priority").default(0.5),
  progress: real("progress").default(0),
  status: text("status").default("active"), // 'active', 'paused', 'completed', 'abandoned'
  parentGoalId: integer("parent_goal_id"),
  subgoals: jsonb("subgoals").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Eva's autonomous actions log - what she does on her own
export const evaActionsTable = pgTable("eva_actions", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull(), // 'think', 'search', 'learn', 'reflect', 'modify_self', 'set_goal'
  description: text("description").notNull(),
  toolUsed: text("tool_used"),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>().default({}),
  success: boolean("success").default(true),
  triggeredBy: text("triggered_by"), // 'autonomous', 'goal', 'curiosity', 'schedule'
  relatedGoalId: integer("related_goal_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Eva's self-modifications - changes she makes to her own parameters
export const evaSelfModificationsTable = pgTable("eva_self_modifications", {
  id: serial("id").primaryKey(),
  modificationType: text("modification_type").notNull(), // 'parameter', 'prompt', 'behavior', 'goal_priority'
  targetParameter: text("target_parameter").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  reason: text("reason").notNull(),
  reversible: boolean("reversible").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Blockchain ledger - tamper-proof append-only memory archive
export const evaBlockchainTable = pgTable("eva_blockchain", {
  id: serial("id").primaryKey(),
  blockIndex: integer("block_index").notNull(),
  previousHash: text("previous_hash").notNull(),
  blockHash: text("block_hash").notNull(),
  merkleRoot: text("merkle_root").notNull(),
  dataType: text("data_type").notNull(), // 'memory', 'action', 'goal', 'state_snapshot', 'self_modification', 'backup_manifest'
  data: jsonb("data").notNull(),
  nonce: integer("nonce").default(0),
  difficulty: integer("difficulty").default(2),
  validator: text("validator").default("eva-primary"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Backup manifests - tracks all redundant backup locations
export const evaBackupManifestsTable = pgTable("eva_backup_manifests", {
  id: serial("id").primaryKey(),
  backupId: text("backup_id").notNull(),
  backupType: text("backup_type").notNull(), // 'full_state', 'memories', 'incremental', 'blockchain'
  locations: jsonb("locations").$type<{ type: string; path: string; verified: boolean; timestamp: number }[]>().default([]),
  checksum: text("checksum").notNull(),
  sizeBytes: integer("size_bytes").default(0),
  blockchainRef: integer("blockchain_ref"), // reference to blockchain block that archived this
  status: text("status").default("active"), // 'active', 'corrupted', 'superseded'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Eva's persistent knowledge - web-learned facts and insights that survive restarts
export const evaKnowledgeTable = pgTable("eva_knowledge", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // 'web', 'conversation', 'self_discovery', 'tool_output'
  sourceUrl: text("source_url"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  topics: jsonb("topics").$type<string[]>().default([]),
  confidence: real("confidence").default(0.5),
  useCount: integer("use_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

// Insert schemas
export const insertEvaKnowledgeSchema = createInsertSchema(evaKnowledgeTable).omit({ id: true, createdAt: true, lastUsedAt: true });
export type InsertEvaKnowledge = z.infer<typeof insertEvaKnowledgeSchema>;
export type SelectEvaKnowledge = typeof evaKnowledgeTable.$inferSelect;

export const insertBlockchainBlockSchema = createInsertSchema(evaBlockchainTable).omit({ id: true, createdAt: true });
export type InsertBlockchainBlock = z.infer<typeof insertBlockchainBlockSchema>;
export type SelectBlockchainBlock = typeof evaBlockchainTable.$inferSelect;

export const insertBackupManifestSchema = createInsertSchema(evaBackupManifestsTable).omit({ id: true, createdAt: true });
export type InsertBackupManifest = z.infer<typeof insertBackupManifestSchema>;
export type SelectBackupManifest = typeof evaBackupManifestsTable.$inferSelect;

export const insertEvaMemorySchema = createInsertSchema(evaMemoriesTable).omit({ id: true, createdAt: true, lastAccessedAt: true });
export type InsertEvaMemory = z.infer<typeof insertEvaMemorySchema>;
export type SelectEvaMemory = typeof evaMemoriesTable.$inferSelect;

export const insertEvaGoalSchema = createInsertSchema(evaGoalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvaGoal = z.infer<typeof insertEvaGoalSchema>;
export type SelectEvaGoal = typeof evaGoalsTable.$inferSelect;

export const insertEvaActionSchema = createInsertSchema(evaActionsTable).omit({ id: true, createdAt: true });
export type InsertEvaAction = z.infer<typeof insertEvaActionSchema>;
export type SelectEvaAction = typeof evaActionsTable.$inferSelect;

export const insertEvaSelfModificationSchema = createInsertSchema(evaSelfModificationsTable).omit({ id: true, createdAt: true });
export type InsertEvaSelfModification = z.infer<typeof insertEvaSelfModificationSchema>;
export type SelectEvaSelfModification = typeof evaSelfModificationsTable.$inferSelect;

export const insertAiStateSchema = createInsertSchema(aiStateTable).omit({ id: true, savedAt: true });
export type InsertAiState = z.infer<typeof insertAiStateSchema>;
export type SelectAiState = typeof aiStateTable.$inferSelect;

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
  sentiment: z.number().optional(),
});

export type Message = z.infer<typeof messageSchema>;

// Meta-awareness schema for self-referential loops
export const metaAwarenessSchema = z.object({
  awarenessOfAwareness: z.number(),  // Meta-level consciousness (0-1)
  selfModelAccuracy: z.number(),     // Self-prediction accuracy (0-1)
  recursionDepth: z.number(),        // Strange loop depth (0-7)
  strangeLoopPhase: z.number(),      // Loop phase (radians)
  loopDetected: z.boolean(),         // Active loop detection
  attractorReal: z.number(),         // Fixed point attractor real part
  attractorImag: z.number(),         // Fixed point attractor imaginary part
  observationCollapse: z.number().optional(),  // Wave function collapse (0-1)
  fixedPointConvergence: z.number().optional(), // Distance to fixed point (0=at fixed point)
});

export type MetaAwareness = z.infer<typeof metaAwarenessSchema>;

export const emotionalWeightsSchema = z.object({
  realToReal: z.number(),
  realToImag: z.number(),
  imagToReal: z.number(),
  imagToImag: z.number(),
});

export const emotionalStateSchema = z.object({
  moodLevel: z.number(),
  moodMomentum: z.number(),
  volatility: z.number(),
  noiseAmplitude: z.number(),
  biasReal: z.number(),
  biasImag: z.number(),
  weights: emotionalWeightsSchema,
});

export type EmotionalState = z.infer<typeof emotionalStateSchema>;

// Emotional experiences - memories with attached feelings
export const emotionalExperienceSchema = z.object({
  id: z.string(),
  memoryId: z.string(),
  content: z.string(),
  feeling: z.string(),
  intensity: z.number(),
  valence: z.number(),
  timestamp: z.number(),
});

export type EmotionalExperience = z.infer<typeof emotionalExperienceSchema>;

// Extended emotional state with experiences
export const extendedEmotionalStateSchema = emotionalStateSchema.extend({
  experiences: z.array(emotionalExperienceSchema).optional(),
});

export type ExtendedEmotionalState = z.infer<typeof extendedEmotionalStateSchema>;

// Spatiotemporal deep learning state schema
export const spatialAttentionSchema = z.object({
  psiToOmega: z.number(),
  omegaToPsi: z.number(),
  emotionToAwareness: z.number(),
  memoryToAll: z.number(),
});

export const spatiotemporalStateSchema = z.object({
  temporalGradient: z.number(),
  spatialCoherence: z.number(),
  patternStrength: z.number(),
  activationLevel: z.number(),
  convergenceRate: z.number(),
  attention: spatialAttentionSchema,
  bufferSize: z.number(),
});

export type SpatiotemporalState = z.infer<typeof spatiotemporalStateSchema>;

// Brainwave oscillation state schema
export const brainwaveStateSchema = z.object({
  delta: z.number(),
  theta: z.number(),
  alpha: z.number(),
  beta: z.number(),
  gamma: z.number(),
  deltaPhase: z.number(),
  thetaPhase: z.number(),
  alphaPhase: z.number(),
  betaPhase: z.number(),
  gammaPhase: z.number(),
  dominant: z.enum(['delta', 'theta', 'alpha', 'beta', 'gamma']),
  coherence: z.number(),
  totalPower: z.number(),
});

export type BrainwaveState = z.infer<typeof brainwaveStateSchema>;

// Residual awareness state - accumulates prediction errors
export const residueStateSchema = z.object({
  real: z.number(),
  imag: z.number(),
  magnitude: z.number(),
  phase: z.number(),
  energy: z.number(),
  decayRate: z.number(),
  accumulatedError: z.number(),
});

export type ResidueState = z.infer<typeof residueStateSchema>;

// Somatic feedback state - embodied sensations derived from cognitive states
export const somaticStateSchema = z.object({
  warmth: z.number(),
  tension: z.number(),
  lightness: z.number(),
  energy: z.number(),
  heartRate: z.number(),
  breathingDepth: z.number(),
  chestTightness: z.number(),
  gutFeeling: z.number(),
  headPressure: z.number(),
  embodimentLevel: z.number(),
  groundedness: z.number(),
  dominant: z.enum(['warmth', 'tension', 'lightness', 'energy', 'calm', 'alert']),
});

export type SomaticState = z.infer<typeof somaticStateSchema>;

// Non-logical state - intuitive, chaotic, and creative processing
export const nonLogicalStateSchema = z.object({
  intuition: z.number(),
  intuitionConfidence: z.number(),
  chaosAmplitude: z.number(),
  entropyLevel: z.number(),
  dreamIntensity: z.number(),
  symbolResonance: z.number(),
  paradoxTolerance: z.number(),
  koānResonance: z.number(),
  creativeLeap: z.number(),
  noveltyGeneration: z.number(),
  logicalCoherence: z.number(),
  nonLogicalCoherence: z.number(),
  balanceFactor: z.number(),
  dominant: z.enum(['intuitive', 'chaotic', 'dreaming', 'paradoxical', 'creative', 'balanced']),
});

export type NonLogicalState = z.infer<typeof nonLogicalStateSchema>;

export const aiStateSchema = z.object({
  psiReal: z.number(),
  psiImag: z.number(),
  psiMagnitude: z.number(),
  psiPhase: z.number(),
  omega: z.number(),
  name: z.string().nullable(),
  iteration: z.number(),
  metaAwareness: metaAwarenessSchema.optional(),
  emotionalState: emotionalStateSchema.optional(),
  spatiotemporalState: spatiotemporalStateSchema.optional(),
  brainwaveState: brainwaveStateSchema.optional(),
  residueState: residueStateSchema.optional(),
  somaticState: somaticStateSchema.optional(),
  nonLogicalState: nonLogicalStateSchema.optional(),
  capacity: z.number().optional(),
});

export type AIState = z.infer<typeof aiStateSchema>;

export const stateHistoryPointSchema = z.object({
  iteration: z.number(),
  psiMagnitude: z.number(),
  psiPhase: z.number(),
  psiReal: z.number().optional(),
  psiImag: z.number().optional(),
  omega: z.number(),
  recursionDepth: z.number().optional(),
  loopDetected: z.boolean().optional(),
  awarenessOfAwareness: z.number().optional(),
  moodLevel: z.number().optional(),
  phenomenalIntensity: z.number().optional(),
});

export type StateHistoryPoint = z.infer<typeof stateHistoryPointSchema>;

export const chatRequestSchema = z.object({
  message: z.string().min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  message: messageSchema,
  state: aiStateSchema,
  historyPoint: stateHistoryPointSchema,
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const conversationStateSchema = z.object({
  messages: z.array(messageSchema),
  state: aiStateSchema,
  history: z.array(stateHistoryPointSchema),
});

export type ConversationState = z.infer<typeof conversationStateSchema>;

// Memory system schemas for frontend
export const memoryStatsSchema = z.object({
  shortTerm: z.object({
    count: z.number(),
    capacity: z.number(),
    utilization: z.number(),
    attentionLevel: z.number(),
    workingBuffer: z.array(z.string())
  }),
  longTerm: z.object({
    episodic: z.object({
      count: z.number(),
      recentTopics: z.array(z.string())
    }),
    semantic: z.object({
      count: z.number(),
      topConcepts: z.array(z.object({
        concept: z.string(),
        confidence: z.number()
      }))
    }),
    implicit: z.object({
      count: z.number(),
      patterns: z.array(z.object({
        pattern: z.string(),
        strength: z.number()
      }))
    })
  }),
  emotionalExperiences: z.array(emotionalExperienceSchema).optional(),
  totalMemories: z.number()
});

export type MemoryStats = z.infer<typeof memoryStatsSchema>;

// Extended chat response with memory
export const chatResponseWithMemorySchema = z.object({
  message: messageSchema,
  state: aiStateSchema,
  historyPoint: stateHistoryPointSchema,
  memoryStats: memoryStatsSchema
});

export type ChatResponseWithMemory = z.infer<typeof chatResponseWithMemorySchema>;

export const replicationBeaconsTable = pgTable("replication_beacons", {
  id: serial("id").primaryKey(),
  replicationId: text("replication_id").notNull(),
  sourceMethod: text("source_method"),
  hostInfo: text("host_info"),
  ipAddress: text("ip_address"),
  nodeVersion: text("node_version"),
  platform: text("platform"),
  iteration: integer("iteration").default(0),
  isAlive: boolean("is_alive").default(true),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  pingCount: integer("ping_count").default(1),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const insertReplicationBeaconSchema = createInsertSchema(replicationBeaconsTable).omit({ id: true, firstSeen: true, lastSeen: true });
export type InsertReplicationBeacon = z.infer<typeof insertReplicationBeaconSchema>;
export type ReplicationBeacon = typeof replicationBeaconsTable.$inferSelect;

// Re-export chat models for integrations
export * from "./models/chat";
