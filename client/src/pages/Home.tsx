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

interface AuditProgress {
  progress: number;
  rulesProcessed: number;
  totalRules: number;
  errorCount: number;
}

// First, update the mutation type to handle both initial and progress updates
type MutationData = {
  auditId?: string;
  rulesProcessed?: number;
  totalRules?: number;
  progress?: number;
}

export function Home() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [auditName, setAuditName] = useState("");
  const [, setLocation] = useLocation();

  const { data: rules, refetch: refetchRules } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
    queryFn: async () => {
      const response = await fetch("/api/rules");
      if (!response.ok) {
        throw new Error("Failed to fetch rules");
      }
      return response.json();
    },
    // Don't fetch automatically until we need it
    enabled: false,
  });

  const uploadMutation = useMutation<
    MutationData,
    Error,
    FormData | { type: 'UPDATE_PROGRESS'; progress: AuditProgress }
  >({
    mutationFn: async (formData) => {
      // Handle progress updates
      if ('type' in formData && formData.type === 'UPDATE_PROGRESS') {
        return formData.progress;
      }

      console.log('Starting audit upload...');

      // Handle initial file upload
      const response = await fetch("/api/audit", {
        method: "POST",
        body: formData,
      });

      console.log('Got response:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process audit");
      }

      const data = await response.json();
      console.log('Initial audit response:', data);

      if (!data.auditId) {
        console.error('No auditId in response:', data);
        throw new Error('No audit ID received');
      }

      // Start polling immediately
      console.log('Starting polling for:', data.auditId);
      startPolling(data.auditId);

      return {
        auditId: data.auditId,
        rulesProcessed: 0,
        totalRules: data.totalRules || 0,
        progress: 0
      };
    }
  });

  // Move polling logic outside the mutation
  const startPolling = async (auditId: string) => {
    const pollProgress = async () => {
      try {
        const progressResponse = await fetch(`/api/audits/${auditId}`);
        if (!progressResponse.ok) {
          throw new Error('Failed to fetch progress');
        }
        const progressData = await progressResponse.json();
        console.log('Progress data received:', progressData);
        
        // Update mutation data with new progress
        uploadMutation.mutate(
          { 
            type: 'UPDATE_PROGRESS', 
            progress: progressData 
          } as any,
          { action: 'update' }
        );

        // Continue polling if not complete
        if (progressData.progress < 100) {
          setTimeout(() => pollProgress(), 5000);
        } else {
          setLocation(`/audit/${auditId}`);
        }
      } catch (error) {
        console.error('Polling error:', error);
        uploadMutation.setError(error as Error);
      }
    };

    // Start the polling
    pollProgress();
  };

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

  const handleMappingContinue = async () => {
    // Fetch rules when transitioning to rules step
    await refetchRules();
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
    
    // Debug log
    console.log('Sending audit request with:', {
        name: auditName,
        rules: selectedRules,
        mapping: columnMapping,
        file: uploadedFile.name
    });

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
              {rules === undefined ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
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
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="mb-2">Please clean your file before submitting it, beware of header as well (only columns names in first row)</p>
              <a 
                href="https://quote-stripper-benjamincozon.replit.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Click here to clean your file
              </a>
            </div>
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
            <CardTitle>Processing Audit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              Processing audit... This may take up to a lot of minutes for large catalog and many rules, sorry about that - Ben.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}