import { rules } from "./schema";
import type { InsertRule } from "./schema";

export const defaultRules: Omit<InsertRule, "id" | "createdAt">[] = [
  {
    name: "ID Check",
    description: "Verifies that the product ID is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "id" },
    criticality: "critical",
  },
  {
    name: "Title Check",
    description: "Verifies that the product title is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "title" },
    criticality: "critical",
  },
  {
    name: "Description Check",
    description: "Verifies that the product description is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "description" },
    criticality: "critical",
  },
  {
    name: "Link Check",
    description: "Verifies that the product link is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "link" },
    criticality: "critical",
  },
  {
    name: "Image Link Check",
    description: "Verifies that the product image link is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "image_link" },
    criticality: "critical",
  },
  {
    name: "Additional Image Link Check",
    description: "Verifies that the additional image link is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "additional_image_link" },
    criticality: "critical",
  },
  {
    name: "Availability Check",
    description: "Verifies that the product availability is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "availability" },
    criticality: "critical",
  },
  {
    name: "Price Check",
    description: "Verifies that the product price is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "price" },
    criticality: "critical",
  },
  {
    name: "Brand Check",
    description: "Verifies that the product brand is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "brand" },
    criticality: "critical",
  },
  {
    name: "GTIN Check",
    description: "Verifies that the product GTIN is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "gtin" },
    criticality: "critical",
  },
  {
    name: "Google Product Category Check",
    description: "Verifies that the Google product category is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "google_product_category" },
    criticality: "critical",
  },
  {
    name: "Product Type Check",
    description: "Verifies that the product type is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "product_type" },
    criticality: "critical",
  },
  {
    name: "Item Group ID Check",
    description: "Verifies that the item group ID is not empty",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "item_group_id" },
    criticality: "critical",
  },
  {
    name: "Color Check",
    description: "Verifies that the product color is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "color" },
    criticality: "critical",
  },
  {
    name: "Size Check",
    description: "Verifies that the product size is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "size" },
    criticality: "critical",
  },
  {
    name: "Material Check",
    description: "Verifies that the product material is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "material" },
    criticality: "critical",
  },
  {
    name: "Age Group Check",
    description: "Verifies that the age group is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "age_group" },
    criticality: "critical",
  },
  {
    name: "Gender Check",
    description: "Verifies that the gender is specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "gender" },
    criticality: "critical",
  },
  {
    name: "Product Highlight Check",
    description: "Verifies that product highlights are specified",
    category: "Required Fields",
    condition: { type: "notEmpty", field: "product_highlight" },
    criticality: "warning",
  },
];

export async function seedDefaultRules(db: any) {
  try {
    // Clear existing rules
    await db.delete(rules);

    // Insert default rules
    await db.insert(rules).values(defaultRules);
    console.log(`${defaultRules.length} default rules seeded successfully`);
  } catch (error) {
    console.error("Error seeding default rules:", error);
  }
}
