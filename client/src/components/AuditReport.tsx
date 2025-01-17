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
import { useQuery } from "@tanstack/react-query";

interface AuditReportProps {
  audit: Audit;
  onPageChange: (page: number) => void; // Added onPageChange function
}

// Add proper type for rule stats
interface RuleStats {
  rule: string;
  ok: number;
  warning: number;
  critical: number;
}

export function AuditReport({ audit, onPageChange }: AuditReportProps) {
  // Add type safety for the numbers
  const totalProducts = Number(audit.totalProducts) || 0;
  const compliantProducts = Number(audit.compliantProducts) || 0;
  const warningProducts = Number(audit.warningProducts) || 0;
  const criticalProducts = Number(audit.criticalProducts) || 0;

  console.log('Audit data received:', {
    totalProducts,
    compliantProducts,
    warningProducts,
    criticalProducts,
    fullAudit: audit
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const pieChartData = [
    { name: "Compliant", value: audit.compliantProducts, color: "#22c55e" },
    { name: "Warnings", value: audit.warningProducts, color: "#f59e0b" },
    { name: "Critical", value: audit.criticalProducts, color: "#ef4444" },
  ];

  const calculateComplianceScore = () => {
    if (totalProducts === 0) return 0;
    const score = ((compliantProducts + warningProducts * 0.5) / totalProducts) * 100;
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

  const { data: ruleStats, error: ruleStatsError, isLoading: ruleStatsLoading } = useQuery<RuleStats[]>({
    queryKey: [`/api/audits/${audit.id}/rule-stats`],
    queryFn: async () => {
      const response = await fetch(`/api/audits/${audit.id}/rule-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch rule stats');
      }
      const data = await response.json();
      console.log('Received rule stats:', data); // Debug log
      return data;
    },
    retry: false, // Don't retry on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Near the top of the component, add data validation
  const validRuleStats = ruleStats?.map(stat => ({
    ...stat,
    ok: Number(stat.ok) || 0,
    warning: Number(stat.warning) || 0,
    critical: Number(stat.critical) || 0
  })) || [];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalProducts || 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isNaN(calculateComplianceScore()) ? 'N/A' : `${calculateComplianceScore()}%`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Critical Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {audit.criticalProducts ?? 'N/A'}
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
              {ruleStatsError ? (
                <div className="flex items-center justify-center h-full text-destructive">
                  Error loading rule statistics
                </div>
              ) : ruleStatsLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div>
              ) : !ruleStats?.length ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No rule statistics available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={validRuleStats}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 150, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="category" 
                      dataKey="rule" 
                      angle={-45} 
                      textAnchor="end" 
                      interval={0} 
                      height={100} 
                    />
                    <YAxis 
                      type="number" 
                      unit="%" 
                      domain={[0, 100]} 
                      tickFormatter={(value) => `${Math.round(value)}%`} 
                    />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white p-2 border rounded shadow">
                            {payload.map((entry: any) => {
                              // Ensure value is a number and handle potential undefined/null
                              const value = typeof entry.value === 'number' ? entry.value : 0;
                              return (
                                <div key={entry.name} className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span>
                                    {entry.name}: {value.toFixed(1)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle" 
                      wrapperStyle={{ marginLeft: '50px' }} 
                    />
                    <Bar dataKey="ok" stackId="stack" fill="#22c55e" name="Compliant" />
                    <Bar dataKey="warning" stackId="stack" fill="#f59e0b" name="Warning" />
                    <Bar dataKey="critical" stackId="stack" fill="#ef4444" name="Critical" />
                  </BarChart>
                </ResponsiveContainer>
              )}
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