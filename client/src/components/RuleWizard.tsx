import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Rule } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  condition: z.object({
    type: z.enum(["notEmpty", "minLength", "contains", "regex", "range", "crossField"], {
      required_error: "Please select a condition type",
    }),
    field: z.string().min(1, "Field name is required"),
    value: z.any().superRefine((val, ctx) => {
      if (val === undefined || val === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value is required",
        });
        return;
      }
      return val;
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
        try {
          const crossField = JSON.parse(data.value);
          if (!crossField.field || !crossField.operator || !["==", "!=", ">", ">=", "<", "<="].includes(crossField.operator)) {
            throw new Error();
          }
        } catch {
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
      },
      criticality: "warning",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                Choose a category to organize rules, such as "Mandatory Fields", "Content Quality", "Cross-field Validation"
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
                </SelectContent>
              </Select>
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
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                The field in the product feed to check
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                      {...field}
                      type="number"
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value);
                        field.onChange(isNaN(numValue) ? undefined : numValue);
                      }}
                      value={field.value?.toString() ?? ""}
                    />
                  );
                  description = "Enter the minimum number of characters required";
                  break;
                case "contains":
                  inputElement = (
                    <Input
                      {...field}
                      type="text"
                      value={field.value?.toString() ?? ""}
                    />
                  );
                  description = "Enter the text that must be contained in the field";
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
                  description = "Enter a valid regular expression pattern";
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
                  description = "Enter the minimum and maximum values for the range";
                  break;
                case "crossField":
                  inputElement = (
                    <div className="space-y-2">
                      <Input
                        placeholder="Field name to compare"
                        onChange={(e) => {
                          const compareField = e.target.value;
                          const current = field.value ? JSON.parse(field.value) : { field: "", operator: "==" };
                          field.onChange(JSON.stringify({ ...current, field: compareField }));
                        }}
                        value={field.value ? JSON.parse(field.value).field || "" : ""}
                      />
                      <Select
                        onValueChange={(operator) => {
                          const current = field.value ? JSON.parse(field.value) : { field: "", operator: "==" };
                          field.onChange(JSON.stringify({ ...current, operator }));
                        }}
                        value={field.value ? JSON.parse(field.value).operator : "=="}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="==">Equal to</SelectItem>
                          <SelectItem value="!=">Not equal to</SelectItem>
                          <SelectItem value=">">Greater than</SelectItem>
                          <SelectItem value=">=">Greater than or equal</SelectItem>
                          <SelectItem value="<">Less than</SelectItem>
                          <SelectItem value="<=">Less than or equal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                  description = "Select a field to compare and the comparison operator";
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
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Rule"}
        </Button>
      </form>
    </Form>
  );
}