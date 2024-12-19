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
import { parse as dateParse, isValid } from "date-fns";
import { sampleProducts } from "@/lib/sampleProducts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RulePreviewProps {
  rule: Partial<Rule>;
}

export function RulePreview({ rule }: RulePreviewProps) {
  const [sampleData, setSampleData] = useState("");
  const [isValidJson, setIsValidJson] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

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

        case "crossField":
          try {
            const crossField = typeof rule.condition.value === 'string' 
              ? JSON.parse(rule.condition.value)
              : rule.condition.value;

            // Validate crossField structure
            if (!crossField || !crossField.field || !crossField.operator) {
              return {
                status: "warning",
                message: "Invalid cross-field condition format",
              };
            }
            
            const compareFieldValue = data[crossField.field];
            if (compareFieldValue === undefined) {
              return {
                status: "warning",
                message: `Comparison field '${crossField.field}' not found in sample data`,
              };
            }

            const compareResult = compareValues(fieldValue, compareFieldValue, crossField.operator);
            
            // Use more descriptive messages
            const operatorText = {
              "==": "equal to",
              "!=": "not equal to",
              "contains": "contains",
              ">": "greater than",
              ">=": "greater than or equal to",
              "<": "less than",
              "<=": "less than or equal to"
            }[crossField.operator] || crossField.operator;

            return {
              status: compareResult ? "ok" : rule.criticality,
              message: compareResult
                ? `Field '${rule.condition.field}' (${fieldValue}) is ${operatorText} '${crossField.field}' (${compareFieldValue})`
                : `Field '${rule.condition.field}' (${fieldValue}) is not ${operatorText} '${crossField.field}' (${compareFieldValue})`,
            };
          } catch (error) {
            console.error('Cross-field validation error:', error);
            return {
              status: "warning",
              message: "Invalid cross-field condition configuration",
            };
          }

        case "date":
          try {
            let parsedDate;
            if (rule.condition.dateFormat === "ISO") {
              parsedDate = new Date(fieldValue);
            } else {
              const format = rule.condition.dateFormat?.replace("YYYY", "yyyy") || "yyyy-MM-dd";
              parsedDate = dateParse(fieldValue, format, new Date());
            }
            
            const isValid = !isNaN(parsedDate.getTime());
            return {
              status: isValid ? "ok" : rule.criticality,
              message: isValid
                ? "Date is valid and matches the specified format"
                : `Invalid date format (expected: ${rule.condition.dateFormat || "yyyy-MM-dd"})`,
            };
          } catch {
            return {
              status: rule.criticality,
              message: "Invalid date value",
            };
          }

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

  // Generate sample data template based on rule type
  const getSampleTemplate = () => {
    if (!rule.condition?.field) return "{}";

    const field = rule.condition.field;
    let template: Record<string, any> = {};

    switch (rule.condition.type) {
      case "notEmpty":
        template = { [field]: "Sample text" };
        break;
      case "minLength":
        template = { [field]: "abc" }; // Short text to demonstrate minimum length
        break;
      case "contains":
        template = { [field]: "This is a sample text" };
        break;
      case "regex":
        template = { [field]: "abc123" }; // Example for alphanumeric pattern
        break;
      case "range":
        template = { [field]: "50" }; // Middle value for range
        break;
      case "crossField":
        const crossField = rule.condition.value?.field || "otherField";
        template = {
          [field]: "Value 1",
          [crossField]: "Value 2"
        };
        break;
      case "date":
        template = { [field]: "2024-01-01" }; // ISO date format
        break;
      default:
        template = { [field]: "value" };
    }

    return JSON.stringify(template, null, 2);
  };

  // Helper function for cross-field comparisons
  const compareValues = (value1: string, value2: string, operator: string) => {
    const v1 = value1.toLowerCase();
    const v2 = value2.toLowerCase();
    
    switch (operator) {
      case "==": return v1 === v2;
      case "!=": return v1 !== v2;
      case "contains": return v1.includes(v2);
      case ">": return parseFloat(v1) > parseFloat(v2);
      case ">=": return parseFloat(v1) >= parseFloat(v2);
      case "<": return parseFloat(v1) < parseFloat(v2);
      case "<=": return parseFloat(v1) <= parseFloat(v2);
      default: return false;
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = sampleProducts.find((p) => p.id === productId);
    if (product) {
      setSampleData(JSON.stringify(product, null, 2));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rule Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Select Sample Product
          </label>
          <Select
            value={selectedProductId}
            onValueChange={(value) => {
              setSelectedProductId(value);
              const product = sampleProducts.find(p => p.id === value);
              if (product) {
                setSampleData(JSON.stringify(product, null, 2));
                setIsValidJson(true);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a product to test" />
            </SelectTrigger>
            <SelectContent>
              {sampleProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.id} - {product.title || '[No Title]'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Product Data
          </label>
          <Textarea
            placeholder={getSampleTemplate()}
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
            className="font-mono min-h-[200px]"
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