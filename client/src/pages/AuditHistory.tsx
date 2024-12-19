import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { format } from "date-fns";
import { BarChart2 } from "lucide-react";
import type { Audit } from "@/lib/types";

export function AuditHistory() {
  const { data: audits, isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>View all previous product data audits</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Total Products</TableHead>
                <TableHead>Compliance Score</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits?.map((audit) => {
                const complianceScore = Math.round(
                  ((audit.compliantProducts + audit.warningProducts * 0.5) /
                    audit.totalProducts) *
                    100
                );

                return (
                  <TableRow key={audit.id}>
                    <TableCell>{audit.name}</TableCell>
                    <TableCell>{audit.totalProducts}</TableCell>
                    <TableCell>{complianceScore}%</TableCell>
                    <TableCell>
                      {format(new Date(audit.createdAt), "PPp")}
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/audit/${audit.id}`}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <BarChart2 className="w-4 h-4 mr-1" />
                        View Report
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
