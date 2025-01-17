import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { BarChart2, Trash2, Download } from "lucide-react";
import type { Audit } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";

export function AuditHistory() {
  const { data: audits, isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
    queryFn: async () => {
      const response = await fetch("/api/audits");
      if (!response.ok) {
        throw new Error("Failed to fetch audits");
      }
      return response.json();
    },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this audit?")) return;

    try {
      const response = await fetch(`/api/audits/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete audit');
      
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Success",
        description: "Audit deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete audit",
        variant: "destructive"
      });
    }
  };

  const handleExport = async (id: number) => {
    try {
      const response = await fetch(`/api/audits/${id}/export`);
      
      if (!response.ok) {
        if (response.status === 507) {
          toast({
            title: "Export Failed",
            description: "This audit is too large to export. Please contact support for assistance.",
            variant: "destructive"
          });
          return;
        }
        throw new Error('Failed to export audit');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${id}-export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Audit exported successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export audit",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <TooltipProvider>
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
                        <div className="flex gap-4">
                          <Link 
                            href={`/audit/${audit.id}`}
                            className="inline-flex items-center text-sm text-primary hover:underline"
                          >
                            <BarChart2 className="w-4 h-4 mr-1" />
                            View Report
                          </Link>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleExport(audit.id)}
                                className="inline-flex items-center text-sm text-blue-500 hover:underline"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Export audit data as CSV</p>
                            </TooltipContent>
                          </Tooltip>
                          <button
                            onClick={() => handleDelete(audit.id)}
                            className="inline-flex items-center text-sm text-red-500 hover:underline"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
