import { z } from "zod";

// GLM-4.6 API Types
export const GLMMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const GLMRequestSchema = z.object({
  model: z.string().default("glm-4.6"),
  messages: z.array(GLMMessageSchema),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().optional(),
  stream: z.boolean().optional().default(false),
  thinking: z.object({
    type: z.enum(["enabled", "disabled"]).default("enabled"),
  }).optional(),
});

export type GLMMessage = z.infer<typeof GLMMessageSchema>;
export type GLMRequest = z.infer<typeof GLMRequestSchema>;

// Dataset Schema Types
export const ColumnTypeSchema = z.enum([
  "INTEGER",
  "BIGINT",
  "DOUBLE",
  "VARCHAR",
  "DATE",
  "TIMESTAMP",
  "BOOLEAN",
]);

export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  samples: z.array(z.any()).optional(),
  distinct_count: z.number().optional(),
  min: z.any().optional(),
  max: z.any().optional(),
});

export const TableSchemaSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnSchema),
  row_count: z.number(),
});

export const DatasetSchemaSchema = z.object({
  id: z.string(),
  tables: z.array(TableSchemaSchema),
  created_at: z.string(),
});

export type ColumnType = z.infer<typeof ColumnTypeSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type TableSchema = z.infer<typeof TableSchemaSchema>;
export type DatasetSchema = z.infer<typeof DatasetSchemaSchema>;

// AI Response Schema (structured output from GLM-4.6)
export const ChartSpecSchema = z.object({
  type: z.enum(["bar", "line", "area", "scatter", "none"]),
  x: z.string().optional(),
  y: z.union([z.string(), z.array(z.string())]).optional(),
  series: z.string().optional(),
  note: z.string().optional(),
});

export const AIResponseSchema = z.object({
  sql: z.string(),
  summary: z.string(),
  chart: ChartSpecSchema.optional(),
});

export type ChartSpec = z.infer<typeof ChartSpecSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;

// Query Result
export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

// Chat Message
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sql?: string;
  result?: QueryResult;
  chart?: ChartSpec;
  timestamp: number;
  streaming?: boolean;
}

// Upload Response
export interface UploadResponse {
  datasetId: string;
  schema: DatasetSchema;
  filename: string;
  size: number;
}
