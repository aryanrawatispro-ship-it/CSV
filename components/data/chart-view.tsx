"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSpec, QueryResult } from "@/lib/types";
import { VegaLite } from "react-vega";
import { VisualizationSpec } from "vega-embed";

interface ChartViewProps {
  chart: ChartSpec;
  result: QueryResult;
}

export function ChartView({ chart, result }: ChartViewProps) {
  if (chart.type === "none" || !chart.x || !chart.y) {
    return null;
  }

  // Convert result to data format for Vega
  const data = result.rows.map((row) => {
    const obj: any = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  // Build Vega-Lite spec
  const spec: VisualizationSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: { values: data },
    mark: {
      type: chart.type as any,
      tooltip: true,
    },
    encoding: {
      x: {
        field: chart.x,
        type: "quantitative",
        title: chart.x,
      },
      y: {
        field: Array.isArray(chart.y) ? chart.y[0] : chart.y,
        type: "quantitative",
        title: Array.isArray(chart.y) ? chart.y[0] : chart.y,
      },
    },
    width: "container",
    height: 300,
    config: {
      axis: {
        labelFontSize: 12,
        titleFontSize: 13,
      },
    },
  };

  // Add series/color encoding if specified
  if (chart.series) {
    spec.encoding!.color = {
      field: chart.series,
      type: "nominal",
      title: chart.series,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Visualization</CardTitle>
        {chart.note && (
          <p className="text-sm text-muted-foreground">{chart.note}</p>
        )}
      </CardHeader>
      <CardContent>
        <VegaLite spec={spec} actions={false} />
      </CardContent>
    </Card>
  );
}
