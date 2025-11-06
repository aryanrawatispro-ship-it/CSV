import { NextRequest, NextResponse } from "next/server";
import { getDuckDBClient } from "@/lib/duckdb-client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const datasetId = params.id;
    const dbClient = getDuckDBClient();

    const schema = await dbClient.getDatasetSchema(datasetId);

    return NextResponse.json(schema);
  } catch (error) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get schema",
      },
      { status: 500 }
    );
  }
}
