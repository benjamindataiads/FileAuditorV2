import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
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
import type { Rule } from "@/lib/types";

export function RuleLibrary() {
  const { toast } = useToast();
  const { data: rules, isLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/rules/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  const formatCondition = (condition: Rule["condition"]) => {
    switch (condition.type) {
      case "notEmpty":
        return `${condition.field} must not be empty`;
      case "minLength":
        return `${condition.field} must be at least ${condition.value} characters`;
      case "contains":
        return `${condition.field} must contain ${condition.value}`;
      default:
        return "Unknown condition";
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Rule Library</h1>
        <Link href="/create-rule">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{rule.category}</TableCell>
                  <TableCell>{formatCondition(rule.condition)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={rule.criticality === "critical" ? "destructive" : "secondary"}
                    >
                      {rule.criticality}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this rule?")) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
