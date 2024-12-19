import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Rule } from "@/lib/types";

interface RulePreviewProps {
  rule: Partial<Rule>;
}

export function RulePreview({ rule }: RulePreviewProps) {
  const [sampleData, setSampleData] = useState("");
  const [isValidJson, setIsValidJson] = useState(true);

  const validationResult = useMemo(() => {
    if (!sampleData || !isValidJson || !rule.condition) return null;

    try {
      const data = JSON.parse(sampleData);
      
      // Check if the field exists in the sample data
      const fieldValue = data[rule.condition.field || ""];
      if (fieldValue === undefined) {
        return {
          status: "warning",
          message: `Field '${rule.condition.field}' not found in sample data`,
        };
      }

      // Evaluate based on condition type
      switch (rule.condition.type) {
        case "notEmpty":
          return {
            status: fieldValue?.toString().trim() ? "ok" : rule.criticality,
            message: fieldValue?.toString().trim() 
              ? "Field has content" 
              : "Field is empty or contains only whitespace",
          };

        case "minLength":
          return {
            status: fieldValue.length >= (rule.condition.value || 0) ? "ok" : rule.criticality,
            message: `Field length is ${fieldValue.length} (minimum: ${rule.condition.value})`,
          };

        case "contains":
          const searchValue = rule.condition.caseSensitive 
            ? rule.condition.value 
            : rule.condition.value?.toLowerCase();
          const testValue = rule.condition.caseSensitive 
            ? fieldValue 
            : fieldValue?.toLowerCase();
          
          return {
            status: testValue?.includes(searchValue) ? "ok" : rule.criticality,
            message: testValue?.includes(searchValue)
              ? `Field contains '${rule.condition.value}'`
              : `Field does not contain '${rule.condition.value}'`,
          };

        case "regex":
          try {
            const regex = new RegExp(rule.condition.value || "", 'i');
            return {
              status: regex.test(fieldValue) ? "ok" : rule.criticality,
              message: regex.test(fieldValue)
                ? "Field matches pattern"
                : "Field does not match pattern",
            };
          } catch {
            return {
              status: "warning",
              message: "Invalid regex pattern",
            };
          }

        case "range":
          const num = parseFloat(fieldValue);
          const range = typeof rule.condition.value === 'string' 
            ? JSON.parse(rule.condition.value)
            : rule.condition.value;
            
          if (isNaN(num)) {
            return {
              status: rule.criticality,
              message: "Value is not a number",
            };
          }
          
          return {
            status: num >= range.min && num <= range.max ? "ok" : rule.criticality,
            message: `Value ${num} is ${num >= range.min && num <= range.max ? "within" : "outside"} range ${range.min}-${range.max}`,
          };

        default:
          return {
            status: "warning",
            message: "Unsupported rule type",
          };
      }
    } catch (e) {
      setIsValidJson(false);
      return {
        status: "warning",
        message: "Invalid JSON data",
      };
    }
  }, [sampleData, rule]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rule Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Sample JSON Data
          </label>
          <Textarea
            placeholder={`{\n  "${rule.condition?.field || 'fieldName'}": "value"\n}`}
            value={sampleData}
            onChange={(e) => {
              setSampleData(e.target.value);
              try {
                JSON.parse(e.target.value);
                setIsValidJson(true);
              } catch {
                setIsValidJson(false);
              }
            }}
            className="font-mono"
          />
          {!isValidJson && (
            <p className="text-sm text-destructive">
              Invalid JSON format
            </p>
          )}
        </div>

        {validationResult && (
          <div className="flex items-start gap-2 p-4 rounded-lg bg-muted">
            {validationResult.status === "ok" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-medium">
                Validation Result: {" "}
                <Badge
                  variant={
                    validationResult.status === "ok"
                      ? "default"
                      : validationResult.status === "warning"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {validationResult.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {validationResult.message}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
