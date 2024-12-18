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
    type: z.enum(["notEmpty", "minLength", "contains"], {
      required_error: "Please select a condition type",
    }),
    field: z.string().min(1, "Field name is required"),
    value: z.union([
      z.string(),
      z.number(),
      z.undefined()
    ]).optional(),
  }).refine((data) => {
    if (data.type === "minLength") {
      return typeof data.value === "number" && data.value > 0;
    }
    if (data.type === "contains") {
      return typeof data.value === "string" && data.value.length > 0;
    }
    return true;
  }, {
    message: "Invalid value for the selected condition type",
    path: ["value"],
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition Value</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type={form.watch("condition.type") === "minLength" ? "number" : "text"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
