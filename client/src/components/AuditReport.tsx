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
import { Download, Info } from "lucide-react";
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

  const handleExport = () => {
    const rules = [...new Set(audit.results?.map(r => r.rule?.name) || [])];
    const groupedResults = audit.results?.reduce((acc, result) => {
      if (!acc[result.productId]) {
        acc[result.productId] = {};
      }
      if (result.rule?.name) {
        acc[result.productId][result.rule.name] = result;
      }
      return acc;
    }, {} as Record<string, Record<string, typeof audit.results[0]>>);

    const csvContent = [
      ["ID", ...rules].join(","),
      ...Object.entries(groupedResults || {}).map(([productId, ruleResults]) =>
        [
          productId,
          ...rules.map(ruleName => 
            ruleResults[ruleName] 
              ? `${ruleResults[ruleName].status}${ruleResults[ruleName].details ? ` (${ruleResults[ruleName].details})` : ''}`
              : "-"
          ),
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  {/* Create columns for each unique rule */}
                  {[...new Set(audit.results?.map(r => r.rule?.name) || [])].map((ruleName) => (
                    <TableHead key={ruleName} className="text-center">
                      {ruleName}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Group results by product ID */}
                {Object.entries(
                  audit.results?.reduce((acc, result) => {
                    if (!acc[result.productId]) {
                      acc[result.productId] = {};
                    }
                    if (result.rule?.name) {
                      acc[result.productId][result.rule.name] = result;
                    }
                    return acc;
                  }, {} as Record<string, Record<string, typeof audit.results[0]>>) || {}
                ).map(([productId, ruleResults]) => (
                  <TableRow key={productId}>
                    <TableCell>{productId}</TableCell>
                    {[...new Set(audit.results?.map(r => r.rule?.name) || [])].map((ruleName) => (
                      <TableCell key={ruleName} className="text-center">
                        {ruleResults[ruleName] ? (
                          <div className="inline-flex items-center">
                            <Badge
                              variant={
                                ruleResults[ruleName].status === "ok"
                                  ? "default"
                                  : ruleResults[ruleName].status === "warning"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {ruleResults[ruleName].status}
                            </Badge>
                            {ruleResults[ruleName].details && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{ruleResults[ruleName].details}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
