import { NextRequest, NextResponse } from "next/server";
import { getGLMClient } from "@/lib/glm-client";
import { getDuckDBClient } from "@/lib/duckdb-client";
import { AIResponseSchema, GLMMessage } from "@/lib/types";
import { z } from "zod";

const RequestSchema = z.object({
  datasetId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
});

// System prompt for GLM-4.6
const SYSTEM_PROMPT = `You translate plain-English analytics questions into SAFE SQL for DuckDB over the uploaded tables, then summarize results.
- First, inspect provided schema.
- Only reference existing columns.
- Prefer CTEs and ISO weeks/dates.
- NEVER use dangerous statements (no INSERT/UPDATE/DELETE/ATTACH/LOAD).
- If the question is ambiguous, ask one clarifying question.
- Also propose a chart if visualization helps.
Return STRICT JSON in this schema:

{
  "sql": "SELECT ...",
  "summary": "One-paragraph human-readable explanation of the answer.",
  "chart": {
    "type": "bar|line|area|scatter|none",
    "x": "<column>",
    "y": "<column or array>",
    "series": "<optional categorical column>",
    "note": "<short justification>"
  }
}`;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { datasetId, messages } = RequestSchema.parse(body);

    const glmClient = getGLMClient();
    const dbClient = getDuckDBClient();

    // Get dataset schema
    const schema = await dbClient.getDatasetSchema(datasetId);

    // Build context with schema information
    const schemaContext = `
Dataset Schema:
${schema.tables
  .map(
    (table) => `
Table: ${table.name} (${table.row_count} rows)
Columns:
${table.columns
  .map(
    (col) =>
      `  - ${col.name}: ${col.type}${col.nullable ? " (nullable)" : ""}
    Distinct values: ${col.distinct_count}
    ${col.samples && col.samples.length > 0 ? `Sample values: ${col.samples.slice(0, 3).join(", ")}` : ""}
    ${col.min !== undefined && col.min !== null ? `Min: ${col.min}, Max: ${col.max}` : ""}`
  )
  .join("\n")}
`
  )
  .join("\n")}
`;

    // Prepare messages for GLM
    const glmMessages: GLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: schemaContext },
      ...messages,
    ];

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";

          // Stream the AI response
          for await (const chunk of glmClient.stream(glmMessages, {
            temperature: 0.7,
            thinking: true,
          })) {
            fullResponse += chunk;

            // Send chunk to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`)
            );
          }

          // Parse the complete response
          let aiResponse;
          try {
            // Try to extract JSON from the response
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("No JSON found in response");
            }

            const jsonStr = jsonMatch[0];
            const parsed = JSON.parse(jsonStr);
            aiResponse = AIResponseSchema.parse(parsed);
          } catch (parseError) {
            console.error("Failed to parse AI response:", fullResponse);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: "Failed to parse AI response. Please try rephrasing your question.",
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // Validate SQL
          const validation = dbClient.validateSQL(aiResponse.sql);
          if (!validation.valid) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: `Invalid SQL: ${validation.error}`,
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // Execute SQL query
          try {
            const result = await dbClient.execute(datasetId, aiResponse.sql);

            // Send final result
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "result",
                  sql: aiResponse.sql,
                  summary: aiResponse.summary,
                  chart: aiResponse.chart,
                  result: {
                    columns: result.columns,
                    rows: result.rows.slice(0, 200), // Limit to 200 rows for display
                    rowCount: result.rowCount,
                  },
                })}\n\n`
              )
            );
          } catch (sqlError) {
            console.error("SQL execution error:", sqlError);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: `SQL execution failed: ${
                    sqlError instanceof Error ? sqlError.message : "Unknown error"
                  }`,
                })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Ask API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
