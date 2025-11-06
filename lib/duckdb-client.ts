import * as duckdb from "duckdb";
import * as fs from "fs";
import * as path from "path";
import { DatasetSchema, TableSchema, Column, QueryResult } from "./types";
import { generateId } from "./utils";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const DATA_DIR = process.env.DATA_DIR || "./data";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DuckDBConnection {
  db: duckdb.Database;
  conn: duckdb.Connection;
}

class DuckDBClient {
  private connections: Map<string, DuckDBConnection> = new Map();

  /**
   * Create a new database connection for a dataset
   */
  async createDataset(datasetId: string): Promise<void> {
    const dbPath = path.join(DATA_DIR, `${datasetId}.duckdb`);

    return new Promise((resolve, reject) => {
      const db = new duckdb.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        db.connect((err, conn) => {
          if (err) {
            reject(err);
            return;
          }

          this.connections.set(datasetId, { db, conn });
          resolve();
        });
      });
    });
  }

  /**
   * Load a CSV file into DuckDB
   */
  async loadCSV(
    datasetId: string,
    filePath: string,
    tableName: string
  ): Promise<TableSchema> {
    const connection = this.connections.get(datasetId);
    if (!connection) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Read and parse CSV to detect types
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parseResult = Papa.parse(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parse error: ${parseResult.errors[0].message}`);
    }

    // Create table from CSV
    const query = `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath}', header=true, auto_detect=true)`;

    await this.execute(datasetId, query);

    // Infer schema
    return this.inferSchema(datasetId, tableName);
  }

  /**
   * Load an Excel file into DuckDB
   */
  async loadExcel(
    datasetId: string,
    filePath: string,
    tableName: string
  ): Promise<TableSchema> {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const tempCsvPath = `${filePath}.csv`;
    fs.writeFileSync(tempCsvPath, csv);

    try {
      const schema = await this.loadCSV(datasetId, tempCsvPath, tableName);
      fs.unlinkSync(tempCsvPath);
      return schema;
    } catch (error) {
      fs.unlinkSync(tempCsvPath);
      throw error;
    }
  }

  /**
   * Infer schema from a table
   */
  async inferSchema(
    datasetId: string,
    tableName: string
  ): Promise<TableSchema> {
    // Get column information
    const describeResult = await this.execute(
      datasetId,
      `DESCRIBE ${tableName}`
    );

    const columns: Column[] = [];

    for (const row of describeResult.rows) {
      const columnName = row[0];
      const columnType = row[1];
      const nullable = row[2] === "YES";

      // Get sample values and stats
      const statsQuery = `
        SELECT
          COUNT(DISTINCT "${columnName}") as distinct_count,
          MIN("${columnName}") as min_val,
          MAX("${columnName}") as max_val
        FROM ${tableName}
      `;

      const statsResult = await this.execute(datasetId, statsQuery);
      const stats = statsResult.rows[0];

      // Get sample values
      const samplesQuery = `
        SELECT DISTINCT "${columnName}"
        FROM ${tableName}
        WHERE "${columnName}" IS NOT NULL
        LIMIT 5
      `;

      const samplesResult = await this.execute(datasetId, samplesQuery);
      const samples = samplesResult.rows.map((r) => r[0]);

      columns.push({
        name: columnName,
        type: columnType,
        nullable,
        distinct_count: stats[0],
        min: stats[1],
        max: stats[2],
        samples,
      });
    }

    // Get row count
    const countResult = await this.execute(
      datasetId,
      `SELECT COUNT(*) FROM ${tableName}`
    );
    const rowCount = countResult.rows[0][0];

    return {
      name: tableName,
      columns,
      row_count: rowCount,
    };
  }

  /**
   * Execute a SQL query
   */
  async execute(datasetId: string, query: string): Promise<QueryResult> {
    const connection = this.connections.get(datasetId);
    if (!connection) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    return new Promise((resolve, reject) => {
      connection.conn.all(query, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Extract column names from first row
        const columns =
          rows.length > 0 ? Object.keys(rows[0]) : [];

        // Convert rows to array format
        const rowsArray = rows.map((row: any) =>
          columns.map((col) => row[col])
        );

        resolve({
          columns,
          rows: rowsArray,
          rowCount: rows.length,
        });
      });
    });
  }

  /**
   * Validate SQL query safety (prevent dangerous operations)
   */
  validateSQL(sql: string): { valid: boolean; error?: string } {
    const upperSQL = sql.toUpperCase();

    // Dangerous keywords
    const dangerousKeywords = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "TRUNCATE",
      "ALTER",
      "CREATE",
      "ATTACH",
      "DETACH",
      "LOAD",
      "INSTALL",
      "PRAGMA",
    ];

    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        return {
          valid: false,
          error: `Dangerous SQL keyword detected: ${keyword}`,
        };
      }
    }

    // Must start with SELECT
    if (!upperSQL.trim().startsWith("SELECT") && !upperSQL.trim().startsWith("WITH")) {
      return {
        valid: false,
        error: "Only SELECT queries are allowed",
      };
    }

    return { valid: true };
  }

  /**
   * Get dataset schema
   */
  async getDatasetSchema(datasetId: string): Promise<DatasetSchema> {
    const connection = this.connections.get(datasetId);
    if (!connection) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Get all tables
    const tablesResult = await this.execute(
      datasetId,
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    const tables: TableSchema[] = [];
    for (const row of tablesResult.rows) {
      const tableName = row[0];
      const schema = await this.inferSchema(datasetId, tableName);
      tables.push(schema);
    }

    const schemaPath = path.join(DATA_DIR, `${datasetId}.schema.json`);
    let createdAt = new Date().toISOString();

    if (fs.existsSync(schemaPath)) {
      const existingSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
      createdAt = existingSchema.created_at;
    }

    const schema: DatasetSchema = {
      id: datasetId,
      tables,
      created_at: createdAt,
    };

    // Save schema
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

    return schema;
  }

  /**
   * Export query results to CSV
   */
  async exportToCSV(datasetId: string, query: string): Promise<string> {
    const result = await this.execute(datasetId, query);

    const csv = Papa.unparse({
      fields: result.columns,
      data: result.rows,
    });

    return csv;
  }

  /**
   * Close database connection
   */
  async close(datasetId: string): Promise<void> {
    const connection = this.connections.get(datasetId);
    if (connection) {
      connection.conn.close();
      connection.db.close();
      this.connections.delete(datasetId);
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const [datasetId] of this.connections) {
      await this.close(datasetId);
    }
  }
}

// Singleton instance
let duckdbClient: DuckDBClient | null = null;

export function getDuckDBClient(): DuckDBClient {
  if (!duckdbClient) {
    duckdbClient = new DuckDBClient();
  }
  return duckdbClient;
}

/**
 * Process uploaded file and create dataset
 */
export async function processUploadedFile(
  filePath: string,
  originalName: string
): Promise<{ datasetId: string; schema: DatasetSchema }> {
  const datasetId = generateId();
  const client = getDuckDBClient();

  await client.createDataset(datasetId);

  const ext = path.extname(originalName).toLowerCase();
  const tableName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_]/g, "_");

  try {
    if (ext === ".csv" || ext === ".tsv") {
      await client.loadCSV(datasetId, filePath, tableName);
    } else if (ext === ".xlsx" || ext === ".xls") {
      await client.loadExcel(datasetId, filePath, tableName);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const schema = await client.getDatasetSchema(datasetId);
    return { datasetId, schema };
  } catch (error) {
    await client.close(datasetId);
    throw error;
  }
}
