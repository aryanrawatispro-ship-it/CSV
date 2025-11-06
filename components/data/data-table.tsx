"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryResult } from "@/lib/types";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableProps {
  result: QueryResult;
  datasetId?: string;
  sql?: string;
}

export function DataTable({ result, datasetId, sql }: DataTableProps) {
  const handleExport = () => {
    if (!datasetId || !sql) return;

    const url = `/api/datasets/${datasetId}/export?query=${encodeURIComponent(
      sql
    )}`;
    window.open(url, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Results ({result.rowCount} rows)
          </CardTitle>
          {datasetId && sql && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {result.columns.map((col) => (
                  <TableHead key={col} className="font-semibold">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={result.columns.length}
                    className="text-center text-muted-foreground"
                  >
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j}>
                        {cell === null || cell === undefined
                          ? "—"
                          : String(cell)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {result.rowCount > result.rows.length && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing first {result.rows.length} of {result.rowCount} rows
          </p>
        )}
      </CardContent>
    </Card>
  );
}
