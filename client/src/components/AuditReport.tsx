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
import { Download, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Audit } from "@/lib/types";

interface AuditReportProps {
  audit: Audit;
}

export function AuditReport({ audit }: AuditReportProps) {
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

  const handleExport = () => {
    const rules = [...new Set(audit.results?.map(r => r.rule?.name) || [])];
    const groupedResults = getGroupedResults();

    const csvContent = [
      ["ID", ...rules].join(","),
      ...Object.entries(groupedResults).map(([productId, results]) =>
        [
          productId,
          ...rules.map(ruleName => {
            const result = results.find(r => r.rule?.name === ruleName);
            return result 
              ? `${result.status}${result.details ? ` (${result.details})` : ''}`
              : "-";
          }),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `audit-${audit.id}-results.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detailed Results</CardTitle>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Product ID</TableHead>
                    {Array.from(new Set((audit.results || []).map(r => r.rule?.name))).map((ruleName) => (
                      <TableHead key={ruleName} className="text-center font-bold">
                        {ruleName}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(getGroupedResults()).length > 0 ? (
                    Object.entries(getGroupedResults()).map(([productId, results]) => (
                      <TableRow key={productId}>
                        <TableCell className="font-medium">{productId}</TableCell>
                        {Array.from(new Set(audit.results?.map(r => r.rule?.name) || [])).map((ruleName) => {
                        const result = results.find(r => r.rule?.name === ruleName);
                        return (
                          <TableCell key={ruleName} className="text-center">
                            {result ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center justify-center">
                                      <Badge
                                        variant="outline"
                                        className={
                                          result.status === "ok"
                                            ? "bg-green-100 text-green-800"
                                            : result.status === "warning"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                        }
                                      >
                                        {result.status === "ok" && (
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                        )}
                                        {result.status === "warning" && (
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                        )}
                                        {result.status === "critical" && (
                                          <XCircle className="h-4 w-4 mr-1" />
                                        )}
                                        {result.status}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  {result.details && (
                                    <TooltipContent className="max-w-sm">
                                      <p className="text-sm">{result.details}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))) : (
                    <TableRow>
                      <TableCell colSpan={Object.keys(getGroupedResults()).length + 1} className="text-center">
                        No results found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}