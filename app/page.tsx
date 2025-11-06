"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Database,
  MessageSquare,
  BarChart3,
  Upload,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Chat with CSV</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl -z-10" />
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Powered by GLM-4.6 AI</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Ask Questions About Your Data
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> Using Natural Language</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload CSV files and get instant insights powered by cutting-edge AI.
            No SQL knowledge required.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/app">
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                <Upload className="h-5 w-5" />
                Get Started
              </Button>
            </Link>
            <Button size="lg" variant="outline" asChild className="hover:scale-105 transition-transform">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">
          Powerful Features
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Easy Upload</CardTitle>
              <CardDescription>
                Drag and drop CSV, Excel, or TSV files. Support for multiple
                file formats.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Natural Language Queries</CardTitle>
              <CardDescription>
                Ask questions in plain English. No SQL knowledge needed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>AI-Powered Analysis</CardTitle>
              <CardDescription>
                Powered by GLM-4.6, the latest AI model for data analysis.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Fast Queries</CardTitle>
              <CardDescription>
                Blazing fast SQL execution with DuckDB engine.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Auto Charts</CardTitle>
              <CardDescription>
                Automatically generate beautiful visualizations from your data.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Export Results</CardTitle>
              <CardDescription>
                Download query results as CSV for further analysis.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Example Queries */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">
          Example Questions You Can Ask
        </h3>
        <div className="max-w-2xl mx-auto space-y-4">
          {[
            "What were the top 5 products by revenue last quarter?",
            "Show me weekly signups by channel for this year",
            "Which customers have the highest lifetime value?",
            "What's the average order value by region?",
            "Find trends in monthly active users over time",
          ].map((query, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">{query}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-lg">
              Upload your first CSV file and start asking questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app">
              <Button size="lg" className="gap-2">
                <Upload className="h-5 w-5" />
                Start Analyzing Data
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by GLM-4.6 AI and DuckDB</p>
        </div>
      </footer>
    </div>
  );
}
