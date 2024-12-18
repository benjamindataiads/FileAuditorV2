import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RuleWizard } from "@/components/RuleWizard";
import type { Rule } from "@/lib/types";

export function CreateRule() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createMutation = useMutation({
    mutationFn: async (rule: Omit<Rule, "id" | "createdAt">) => {
      console.log('Submitting rule:', rule);
      try {
        const response = await fetch("/api/rules", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rule),
        });
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (!response.ok) {
          throw new Error(data.message || "Failed to create rule");
        }
        
        return data;
      } catch (error) {
        console.error('Error creating rule:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      setLocation("/rules");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create New Rule</h1>

      <Card>
        <CardHeader>
          <CardTitle>Rule Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleWizard
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
