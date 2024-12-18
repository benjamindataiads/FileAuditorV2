import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationResult {
  productId: string;
  fieldName: string;
  status: "ok" | "warning" | "critical";
  details: string;
}

interface ValidationPreviewProps {
  results: ValidationResult[];
  isLoading?: boolean;
}

export function ValidationPreview({ results, isLoading }: ValidationPreviewProps) {
  const { summary, groupedResults } = useMemo(() => {
    const grouped = results.reduce((acc, result) => {
      const key = result.productId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {} as Record<string, ValidationResult[]>);

    const summary = {
      total: results.length,
      ok: results.filter(r => r.status === "ok").length,
      warning: results.filter(r => r.status === "warning").length,
      critical: results.filter(r => r.status === "critical").length,
    };

    return { summary, groupedResults: grouped };
  }, [results]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {summary.ok} Passed
        </Badge>
        <Badge variant="outline" className="gap-1">
          <MinusCircle className="h-4 w-4 text-yellow-500" />
          {summary.warning} Warnings
        </Badge>
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-4 w-4 text-red-500" />
          {summary.critical} Critical
        </Badge>
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product ID</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedResults).map(([productId, productResults]) =>
              productResults.map((result, index) => (
                <TableRow key={`${productId}-${index}`}>
                  {index === 0 ? (
                    <TableCell rowSpan={productResults.length}>
                      {productId}
                    </TableCell>
                  ) : null}
                  <TableCell>{result.fieldName}</TableCell>
                  <TableCell>
                    {result.status === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : result.status === "warning" ? (
                      <MinusCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {result.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
