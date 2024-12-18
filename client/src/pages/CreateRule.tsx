import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RuleWizard } from "@/components/RuleWizard";
import type { Rule } from "@/lib/types";

export function CreateRule() {
  const [, setLocation] = useLocation();

  const createMutation = useMutation({
    mutationFn: async (rule: Omit<Rule, "id" | "createdAt">) => {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      setLocation("/rules");
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
