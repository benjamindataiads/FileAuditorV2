import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Audit } from "@/lib/types";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface AuditReportProps {
  audit: Audit;
  onPageChange: (page: number) => void; // Added onPageChange function
}

export function AuditReport({ audit, onPageChange }: AuditReportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const pieChartData = [
    { name: "Compliant", value: audit.compliantProducts, color: "#22c55e" },
    { name: "Warnings", value: audit.warningProducts, color: "#f59e0b" },
    { name: "Critical", value: audit.criticalProducts, color: "#ef4444" },
  ];

  const calculateComplianceScore = () => {
    const total = audit.totalProducts;
    if (total === 0) return 0;

    const score =
      ((audit.compliantProducts + audit.warningProducts * 0.5) / total) * 100;
    return Math.round(score);
  };

  const getGroupedResults = () => {
    console.log("Processing audit results:", {
      auditId: audit.id,
      totalProducts: audit.totalProducts,
      results: audit.results,
      resultsLength: audit?.results?.length || 0
    });
    if (!audit?.results?.length) {
      console.log("No results found in audit");
      return {};
    }
    const grouped = audit.results.reduce((acc, result) => {
      // Ensure we have a valid productId
      if (!result.productId) {
        console.log("Missing productId for result:", result);
        return acc;
      }
      const key = result.productId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {} as Record<string, Array<(typeof audit.results)[number]>>);
    console.log("Grouped results by product:", grouped);
    return grouped;
  };

  const handleExport = async (format: 'tsv') => {
    try {
      setIsExporting(true);
      const response = await fetch(`/api/audits/${audit.id}/export`);
      const content = await response.text();
      
      const mimeType = format === 'csv' ? 'text/csv' : 'text/tab-separated-values';
      const extension = format === 'csv' ? 'csv' : 'tsv';
      
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${audit.id}-results.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Get all unique rules and product IDs
  const allRules = Array.from(new Set(audit.results?.map(r => r.rule?.name).filter(Boolean) || [])).sort();
  const allProductIds = Array.from(new Set(audit.results?.map(r => r.productId) || [])).sort();
  
  // Calculate pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(allProductIds.length / itemsPerPage);
  const currentPage = Math.min(audit.pagination?.page || 1, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, allProductIds.length);

  // Get paginated product IDs
  const paginatedProductIds = allProductIds.slice(startIndex, endIndex);
  
  // Group results by product ID for efficient lookup
  const resultsByProduct = audit.results?.reduce((acc, result) => {
    if (!acc[result.productId]) {
      acc[result.productId] = {};
    }
    if (result.rule?.name) {
      acc[result.productId][result.rule.name] = result;
    }
    return acc;
  }, {} as Record<string, Record<string, typeof audit.results[0]>>);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateComplianceScore()}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Critical Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {audit.criticalProducts}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Results Distribution</CardTitle>
            <CardDescription>
              Overview of product compliance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ marginLeft: '50px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Rule Status Distribution</CardTitle>
            <CardDescription>
              Status distribution for each rule (as % of total products)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={audit.results.reduce((acc, result) => {
                    const ruleName = result.rule?.name || 'Unknown';
                    const existing = acc.find(item => item.rule === ruleName);
                    if (!existing) {
                      acc.push({
                        rule: ruleName,
                        ok: result.status === 'ok' ? 1 : 0,
                        warning: result.status === 'warning' ? 1 : 0,
                        critical: result.status === 'critical' ? 1 : 0,
                        total: 1
                      });
                    } else {
                      existing[result.status] += 1;
                      existing.total += 1;
                    }
                    return acc;
                  }, [] as any[]).map(item => ({
                    rule: item.rule,
                    ok: (item.ok / item.total) * 100,
                    warning: (item.warning / item.total) * 100,
                    critical: (item.critical / item.total) * 100
                  }))}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 150, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="category" dataKey="rule" angle={-45} textAnchor="end" interval={0} height={100} />
                  <YAxis type="number" unit="%" domain={[0, 100]} tickFormatter={(value) => `${Math.round(value)}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ marginLeft: '50px' }} />
                  <Bar dataKey="ok" stackId="stack" fill="#22c55e" name="Compliant" />
                  <Bar dataKey="warning" stackId="stack" fill="#f59e0b" name="Warning" />
                  <Bar dataKey="critical" stackId="stack" fill="#ef4444" name="Critical" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detailed Results</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleExport('tsv')} 
                variant="outline"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export TSV
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">
              Export the detailed results to analyze them in your preferred spreadsheet application
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}