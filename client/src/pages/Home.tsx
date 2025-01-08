import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { ColumnMapping } from "@/components/ColumnMapping";
import type { Rule } from "@/lib/types";

type Step = "upload" | "mapping" | "rules" | "processing";

export function Home() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [auditName, setAuditName] = useState("");
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
      if (!response.ok) {
        throw new Error("Failed to process audit");
      }
      const initialData = await response.json();
      return initialData;
    },
    onSuccess: async (data) => {
      if (!data.auditId) return;

      // Start polling for progress
      const pollProgress = async () => {
        const progressResponse = await fetch(`/api/audits/${data.auditId}`);
        const auditData = await progressResponse.json();
        return auditData.progress || 0;
      };

      const poll = async () => {
        const progress = await pollProgress();
        uploadMutation.mutate({ progress }, { action: 'update' });

        if (progress < 100) {
          setTimeout(poll, 1000);
        } else {
          setLocation(`/audit/${data.auditId}`);
        }
      };

      poll();
    },
    onError: (error) => {
      console.error("Audit processing failed:", error);
      setCurrentStep("rules"); // Go back to rules selection on error
    },
  });

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setCurrentStep("mapping");
    setColumnMapping({});
    // Reset preview when a new file is uploaded
    //setPreviewKey(prev => prev + 1);  Removed as preview is gone
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
  };

  const handleMappingContinue = () => {
    setCurrentStep("rules");
  };

  const handleStartAudit = () => {
    if (!uploadedFile) return;

    setCurrentStep("processing");
    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("name", auditName);
    formData.append("rules", JSON.stringify(selectedRules));
    formData.append("columnMapping", JSON.stringify(columnMapping));
    uploadMutation.mutate(formData);
  };

  const goBack = () => {
    switch (currentStep) {
      case "rules":
        setCurrentStep("upload");
        break;
      case "processing":
        setCurrentStep("rules");
        break;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-8">
        <Progress value={
          currentStep === "upload" ? 33 :
          currentStep === "rules" ? 66 :
          100
        } />
      </div>

      {currentStep === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Map File Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnMapping
              file={uploadedFile!}
              onMappingComplete={handleMappingComplete}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleMappingContinue}
              disabled={Object.keys(columnMapping).length === 0}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Product Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="audit-name" className="text-sm font-medium">
                Audit Name
              </label>
              <input
                id="audit-name"
                type="text"
                value={auditName}
                onChange={(e) => setAuditName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter audit name"
              />
            </div>
            <FileUpload
              onUpload={handleFileUpload}
              accept=".tsv"
              loading={false}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === "rules" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Rules to Apply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-4 border-b">
                <Checkbox
                  id="select-all"
                  checked={rules?.length === selectedRules.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRules(rules?.map(rule => rule.id) || []);
                    } else {
                      setSelectedRules([]);
                    }
                  }}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium leading-none"
                >
                  Select All Rules
                </label>
              </div>
              {rules?.map((rule) => (
                <div key={rule.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rule-${rule.id}`}
                    checked={selectedRules.includes(rule.id)}
                    onCheckedChange={(checked) => {
                      const newSelectedRules = checked
                        ? [...selectedRules, rule.id]
                        : selectedRules.filter((id) => id !== rule.id);
                      setSelectedRules(newSelectedRules);
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
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleStartAudit}
              disabled={selectedRules.length === 0}
            >
              Start Audit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === "processing" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Processing Audit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <div className="w-full max-w-xs space-y-4">
              {uploadMutation.isError ? (
                <p className="text-sm text-destructive text-center">
                  Error processing file. Please try again.
                </p>
              ) : (
                console.log("Progress update:", {
                  progress: uploadMutation.data?.progress || 0,
                  rulesProcessed: uploadMutation.data?.rulesProcessed || 0,
                  totalRules: uploadMutation.data?.totalRules || 0,
                  errorCount: uploadMutation.data?.errorCount || 0
                })
              )}
              <Progress value={uploadMutation.data?.progress || 0} className="mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Processing products... {uploadMutation.data?.progress || 0}%
              </p>
              <Progress 
                value={uploadMutation.data?.rulesProcessed ? (uploadMutation.data.rulesProcessed / uploadMutation.data.totalRules) * 100 : 0} 
                className="mb-2" 
              />
              <p className="text-sm text-muted-foreground text-center">
                Rules processed: {uploadMutation.data?.rulesProcessed || 0}/{uploadMutation.data?.totalRules || 0}
                {uploadMutation.data?.errorCount > 0 && (
                  <span className="text-destructive"> ({uploadMutation.data.errorCount} errors)</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}