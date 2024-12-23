
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Rule } from "@/lib/types";

export function RuleLibrary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rule-library"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Rule Library</h1>
        <Button onClick={() => setLocation('/create-rule')}>Create Rule</Button>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between p-4 bg-card rounded-lg">
            <div>
              <h3 className="font-semibold">{rule.name}</h3>
              <p className="text-sm text-muted-foreground">{rule.description}</p>
            </div>
            <div className="space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  window.localStorage.setItem('editRule', JSON.stringify(rule));
                  setLocation('/rule-edit');
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
