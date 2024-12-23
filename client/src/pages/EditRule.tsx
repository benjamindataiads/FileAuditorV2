import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RuleWizard } from "@/components/RuleWizard";
import type { Rule } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function EditRule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rule, setRule] = useState<Rule | null>(null);

  useEffect(() => {
    const savedRule = window.localStorage.getItem('editRule');
    if (savedRule) {
      setRule(JSON.parse(savedRule));
      window.localStorage.removeItem('editRule');
    } else {
      setLocation('/rule-library');
    }
  }, [setLocation]);

  const updateMutation = useMutation({
    mutationFn: async (values: Omit<Rule, "id" | "createdAt">) => {
      if (!rule?.id) throw new Error("No rule ID");
      
      const response = await fetch(`/api/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, id: rule.id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update rule");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Rule updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      setLocation('/rule-library');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!rule) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Rule</h1>

      <Card>
        <CardHeader>
          <CardTitle>Rule Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleWizard
            initialValues={rule}
            onSubmit={(values) => updateMutation.mutate(values)}
            isSubmitting={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}