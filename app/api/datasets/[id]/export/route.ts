import { NextRequest, NextResponse } from "next/server";
import { getDuckDBClient } from "@/lib/duckdb-client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const datasetId = params.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const dbClient = getDuckDBClient();

    // Validate SQL
    const validation = dbClient.validateSQL(query);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Export to CSV
    const csv = await dbClient.exportToCSV(datasetId, query);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="export_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export data",
      },
      { status: 500 }
    );
  }
}
