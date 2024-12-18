import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Rule } from "@/lib/types";

export function Home() {
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [, setLocation] = useLocation();

  const { data: rules } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/audit", {
        method: "POST",
        body: formData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLocation(`/audit/${data.auditId}`);
    },
  });

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("rules", JSON.stringify(selectedRules));
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Product Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            onUpload={handleUpload}
            accept=".tsv"
            loading={uploadMutation.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Rules to Apply</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules?.map((rule) => (
              <div key={rule.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`rule-${rule.id}`}
                  checked={selectedRules.includes(rule.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRules([...selectedRules, rule.id]);
                    } else {
                      setSelectedRules(selectedRules.filter((id) => id !== rule.id));
                    }
                  }}
                />
                <label
                  htmlFor={`rule-${rule.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {rule.name}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
