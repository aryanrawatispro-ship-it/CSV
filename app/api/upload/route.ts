import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { processUploadedFile } from "@/lib/duckdb-client";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = "./uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || "100") * 1024 * 1024;

// Allowed file extensions
const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".xlsx", ".xls"];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed size of ${
            MAX_FILE_SIZE / 1024 / 1024
          }MB`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `File type ${ext} not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate content type
    const validContentTypes = [
      "text/csv",
      "text/tab-separated-values",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream", // Some browsers use this for CSV
    ];

    if (!validContentTypes.includes(file.type) && file.type !== "") {
      console.warn(`Unexpected content type: ${file.type}, but proceeding based on extension`);
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(UPLOAD_DIR, `${timestamp}_${safeFileName}`);

    await writeFile(filePath, buffer);

    // Process file with DuckDB
    try {
      const { datasetId, schema } = await processUploadedFile(
        filePath,
        file.name
      );

      return NextResponse.json({
        datasetId,
        schema,
        filename: file.name,
        size: file.size,
      });
    } catch (error) {
      // Clean up file on processing error
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Failed to clean up file:", e);
      }

      throw error;
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process file",
      },
      { status: 500 }
    );
  }
}
