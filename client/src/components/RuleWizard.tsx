import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Rule } from "@/lib/types";
import { getFieldNames } from "@/lib/fieldMappings";
import { RulePreview } from "./RulePreview";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  condition: z.object({
    type: z.enum(["notEmpty", "minLength", "contains", "regex", "range", "crossField", "date"], {
      required_error: "Please select a condition type",
    }),
    caseSensitive: z.boolean().optional(),
    dateFormat: z.string().optional(),
    field: z.string().min(1, "Field name is required"),
    value: z.any().optional().superRefine((val, ctx) => {
      const parent = ctx.path[0] as { parent?: { type?: string } };
      const conditionType = parent?.parent?.type;
      
      // Skip validation for notEmpty condition type
      if (conditionType === "notEmpty") {
        return z.NEVER;
      }
      
      // All other condition types require a value
      if (conditionType && (val === undefined || val === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value is required for this condition type",
        });
      }
      return z.NEVER;
    }),
  }).superRefine((data, ctx) => {
    switch (data.type) {
      case "minLength":
        const num = Number(data.value);
        if (isNaN(num) || num <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Minimum length must be a positive number",
            path: ["value"],
          });
        }
        break;
      case "contains":
        if (!data.value || typeof data.value !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Contains value must be a non-empty string",
            path: ["value"],
          });
        }
        break;
      case "regex":
        try {
          new RegExp(data.value);
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid regular expression pattern",
            path: ["value"],
          });
        }
        break;
      case "range":
        try {
          const range = JSON.parse(data.value);
          if (!range.min || !range.max || isNaN(range.min) || isNaN(range.max) || range.min >= range.max) {
            throw new Error();
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Range must be a valid JSON object with min and max numbers",
            path: ["value"],
          });
        }
        break;
      case "crossField":
          const crossField = typeof data.value === 'string' ? 
            JSON.parse(data.value) : data.value;
          if (!crossField || !crossField.field || !crossField.operator || 
              !["==", "!=", "contains", ">", ">=", "<", "<="].includes(crossField.operator)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Cross-field must specify a field and valid operator",
              path: ["value"],
            });
          }
          break;
    }
  }),
  criticality: z.enum(["warning", "critical"]),
});

interface RuleWizardProps {
  onSubmit: (values: Omit<Rule, "id" | "createdAt">) => void;
  isSubmitting?: boolean;
}

export function RuleWizard({ onSubmit, isSubmitting }: RuleWizardProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      condition: {
        type: "notEmpty",
        field: "",
        value: undefined,
        caseSensitive: false,
      },
      criticality: "warning",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        e.preventDefault();
        const values = form.getValues();
        
        // For notEmpty condition type, ensure value is undefined
        if (values.condition.type === "notEmpty") {
          values.condition.value = undefined;
        }
        
        console.log('Form values:', values);
        console.log('Form state:', form.formState);
        
        if (Object.keys(form.formState.errors).length > 0) {
          console.error('Form validation errors:', form.formState.errors);
          return;
        }
        
        onSubmit(values);
      }} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rule Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                Choose a category to organize rules, such as "Mandatory Fields", "Content Quality", "Cross-field Validation".
                Categories help group related rules together for better organization.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="condition.type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a condition type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="notEmpty">Must not be empty</SelectItem>
                  <SelectItem value="minLength">Minimum length</SelectItem>
                  <SelectItem value="contains">Contains value</SelectItem>
                  <SelectItem value="regex">Matches pattern</SelectItem>
                  <SelectItem value="range">Numerical range</SelectItem>
                  <SelectItem value="crossField">Cross-field validation</SelectItem>
                  <SelectItem value="date">Date validation</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="mt-2 space-y-2">
                <p className="font-medium">Rule Types and Their Behavior:</p>
                
                <div className="pl-4 space-y-2 text-sm">
                  <p><strong>Must not be empty:</strong>
                    • OK: Field has any non-whitespace content
                    • Violation: Field is empty or contains only spaces</p>
                    
                  <p><strong>Minimum length:</strong>
                    • OK: Field length meets or exceeds the minimum
                    • Violation: Field length is below the minimum</p>
                    
                  <p><strong>Contains value:</strong>
                    • OK: Field contains the specified text
                    • Violation: Field doesn't contain the text</p>
                    
                  <p><strong>Matches pattern:</strong>
                    • OK: Field matches the regex pattern
                    • Violation: Field doesn't match the pattern</p>
                    
                  <p><strong>Numerical range:</strong>
                    • OK: Number is within the specified range
                    • Violation: Number is outside the range or not numeric</p>
                    
                  <p><strong>Cross-field validation:</strong>
                    • OK: Relationship between fields is valid
                    • Violation: Fields don't satisfy the specified relationship</p>
                    
                  <p><strong>Date validation:</strong>
                    • OK: Valid date in the specified format
                    • Violation: Invalid date or wrong format</p>
                </div>

                <p className="text-sm mt-2">
                  The severity of violations (Warning vs Critical) is determined by 
                  the Criticality setting below.
                </p>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="condition.field"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Name</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field to validate" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getFieldNames().map((fieldName) => (
                    <SelectItem key={fieldName} value={fieldName}>
                      {fieldName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                  Select the field from the product feed that this rule will validate.
                  The rule will be applied to this field's value during validation.
                </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {["contains", "regex"].includes(form.watch("condition.type")) && (
          <FormField
            control={form.control}
            name="condition.caseSensitive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Case Sensitive</FormLabel>
                  <FormDescription>
                    Enable case-sensitive matching for this rule.  If enabled, the rule will be case-sensitive.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {form.watch("condition.type") === "date" && (
          <FormField
            control={form.control}
            name="condition.dateFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Format</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ISO">ISO 8601</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the expected date format for validation.  The rule will check if the field's date matches this format.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {form.watch("condition.type") !== "notEmpty" && (
          <FormField
            control={form.control}
            name="condition.value"
            render={({ field }) => {
              const conditionType = form.watch("condition.type");
              let inputElement;
              let description = "";

              switch (conditionType) {
                case "minLength":
                  inputElement = (
                    <Input
                      type="number"
                      min="1"
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseInt(value) : "");
                      }}
                      value={field.value || ""}
                    />
                  );
                  description = "Enter the minimum number of characters required.  For example, '5' requires at least 5 characters.";
                  break;
                case "contains":
                  inputElement = (
                    <Input
                      {...field}
                      type="text"
                      value={field.value?.toString() ?? ""}
                    />
                  );
                  description = "Enter the text that must be contained in the field. For example, 'example' will trigger a warning if the field does not contain 'example'.";
                  break;
                case "regex":
                  inputElement = (
                    <Input
                      {...field}
                      type="text"
                      placeholder="^[A-Za-z0-9]+$"
                      value={field.value?.toString() ?? ""}
                    />
                  );
                  description = "Enter a valid regular expression pattern. For example, '^[A-Za-z0-9]+$' will match strings containing only alphanumeric characters.";
                  break;
                case "range":
                  inputElement = (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        onChange={(e) => {
                          const min = parseFloat(e.target.value);
                          const current = field.value ? JSON.parse(field.value) : { min: 0, max: 0 };
                          field.onChange(JSON.stringify({ ...current, min }));
                        }}
                        value={field.value ? JSON.parse(field.value).min : ""}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        onChange={(e) => {
                          const max = parseFloat(e.target.value);
                          const current = field.value ? JSON.parse(field.value) : { min: 0, max: 0 };
                          field.onChange(JSON.stringify({ ...current, max }));
                        }}
                        value={field.value ? JSON.parse(field.value).max : ""}
                      />
                    </div>
                  );
                  description = "Enter the minimum and maximum values for the range. For example, '{\"min\": 10, \"max\": 100}' will trigger a warning if the value is outside of this range.";
                  break;
                case "crossField":
                  inputElement = (
                    <div className="space-y-2">
                      <Select
                        onValueChange={(operator) => {
                          const current = field.value || { field: "", operator: "==" };
                          const newValue = { ...current, operator };
                          field.onChange(newValue);
                        }}
                        value={
                          field.value?.operator || "=="
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="==">Equal to</SelectItem>
                          <SelectItem value="!=">Not equal to</SelectItem>
                          <SelectItem value="contains">Contains (case insensitive)</SelectItem>
                          <SelectItem value=">">Greater than</SelectItem>
                          <SelectItem value=">=">Greater than or equal</SelectItem>
                          <SelectItem value="<">Less than</SelectItem>
                          <SelectItem value="<=">Less than or equal</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        onValueChange={(compareField) => {
                          const current = field.value || { field: "", operator: "==" };
                          const newValue = { ...current, field: compareField };
                          field.onChange(newValue);
                        }}
                        value={field.value?.field || ""}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select field to compare" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldNames().map((fieldName) => (
                            <SelectItem key={fieldName} value={fieldName}>
                              {fieldName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                  description = "Select an operator and field to compare.  The rule will compare the values of these two fields.";
                  break;
                default:
                  inputElement = (
                    <Input
                      {...field}
                      type="text"
                      value={field.value?.toString() ?? ""}
                    />
                  );
              }

              return (
                <FormItem>
                  <FormLabel>Condition Value</FormLabel>
                  <FormControl>{inputElement}</FormControl>
                  <FormDescription>{description}</FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        )}

        <FormField
          control={form.control}
          name="criticality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Criticality</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select the severity level for rule violations:
                • Warning: Used for non-critical issues that should be reviewed but don't prevent product usage
                • Critical: Used for severe issues that must be fixed before the product can be used
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="mb-8">
          {isSubmitting ? "Creating..." : "Create Rule"}
        </Button>
      </form>

      <div className="mt-8 pt-8 border-t">
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-semibold">Rule Validation Preview</h3>
          <p className="text-sm text-muted-foreground">
            Test your rule with sample data before creating it. See how different inputs will affect the validation outcome:
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span><strong>OK:</strong> Product meets the rule criteria</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span><strong>Warning:</strong> Non-critical validation issue</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span><strong>Critical:</strong> Severe validation issue that must be fixed</span>
            </div>
          </div>
        </div>
        
        <RulePreview 
          rule={{
            condition: form.watch("condition"),
            criticality: form.watch("criticality"),
          }}
        />
      </div>
    </Form>
  );
}