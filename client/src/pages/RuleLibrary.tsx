import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    queryFn: async () => {
      const response = await fetch("/api/rules");
      if (!response.ok) {
        throw new Error("Failed to fetch rules");
      }
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/rules/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete rule");
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
      
      // Force a full refetch to ensure data consistency
      await queryClient.resetQueries({ queryKey: ["/api/rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
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
      case "regex":
        return `${condition.field} must match pattern: ${condition.value}`;
      case "range":
        const { min, max } = condition.value;
        return `${condition.field} must be between ${min} and ${max}`;
      case "crossField":
        return `${condition.field} must match ${condition.value.field}`;
      case "date":
        return `${condition.field} must be a valid date${condition.dateFormat ? ` (${condition.dateFormat})` : ''}`;
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
                  <TableCell className="space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rule Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="font-semibold">Name:</div>
                            <div>{rule.name}</div>
                            
                            <div className="font-semibold">Category:</div>
                            <div>{rule.category}</div>
                            
                            <div className="font-semibold">Description:</div>
                            <div>{rule.description}</div>
                            
                            <div className="font-semibold">Criticality:</div>
                            <div>
                              <Badge
                                variant={rule.criticality === "critical" ? "destructive" : "secondary"}
                              >
                                {rule.criticality}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="font-semibold">Condition Details:</div>
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                              <p><strong>Type:</strong> {rule.condition.type}</p>
                              <p><strong>Field:</strong> {rule.condition.field}</p>
                              {rule.condition.value && (
                                <p><strong>Value:</strong> {
                                  typeof rule.condition.value === 'object' 
                                    ? JSON.stringify(rule.condition.value, null, 2)
                                    : rule.condition.value
                                }</p>
                              )}
                              {rule.condition.caseSensitive !== undefined && (
                                <p><strong>Case Sensitive:</strong> {rule.condition.caseSensitive ? "Yes" : "No"}</p>
                              )}
                              {rule.condition.dateFormat && (
                                <p><strong>Date Format:</strong> {rule.condition.dateFormat}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Created at: {new Date(rule.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>Are you sure you want to delete this rule?</p>
                            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                              <p><strong>Name:</strong> {rule.name}</p>
                              <p><strong>Category:</strong> {rule.category}</p>
                              <p><strong>Description:</strong> {rule.description}</p>
                              <p><strong>Condition:</strong> {formatCondition(rule.condition)}</p>
                              <p><strong>Criticality:</strong> {rule.criticality}</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(rule.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Rule
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
