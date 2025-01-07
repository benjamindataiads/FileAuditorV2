import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define the condition schema for better type safety
const ruleConditionSchema = z.object({
  type: z.enum(["notEmpty", "minLength", "maxLength", "contains", "doesntContain", "regex", "range", "crossField", "date"]),
  field: z.string(),
  value: z.any().optional(),
  caseSensitive: z.boolean().optional(),
  dateFormat: z.string().optional(),
});

// Rules table to store rule templates
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  condition: jsonb("condition").$type<z.infer<typeof ruleConditionSchema>>().notNull(),
  criticality: text("criticality").notNull(), // "warning" | "critical"
  createdAt: timestamp("created_at").defaultNow(),
});

// Audits table to store audit history
export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileHash: text("file_hash").notNull(),
  totalProducts: integer("total_products").notNull(),
  compliantProducts: integer("compliant_products").notNull(),
  warningProducts: integer("warning_products").notNull(),
  criticalProducts: integer("critical_products").notNull(),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit results table to store detailed results
export const auditResults = pgTable("audit_results", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => audits.id, { onDelete: 'cascade' }).notNull(),
  ruleId: integer("rule_id").references(() => rules.id, { onDelete: "cascade" }).notNull(),
  productId: text("product_id").notNull(),
  status: text("status").notNull(),
  details: text("details"),
});

// Relations
export const auditRelations = relations(audits, ({ many }) => ({
  results: many(auditResults),
}));

export const ruleRelations = relations(rules, ({ many }) => ({
  results: many(auditResults),
}));

export const auditResultRelations = relations(auditResults, ({ one }) => ({
  audit: one(audits, {
    fields: [auditResults.auditId],
    references: [audits.id],
  }),
  rule: one(rules, {
    fields: [auditResults.ruleId],
    references: [rules.id],
  }),
}));

// Schemas
export const insertRuleSchema = createInsertSchema(rules);
export const selectRuleSchema = createSelectSchema(rules);
export const insertAuditSchema = createInsertSchema(audits);
export const selectAuditSchema = createSelectSchema(audits);
export const insertAuditResultSchema = createInsertSchema(auditResults);
export const selectAuditResultSchema = createSelectSchema(auditResults);

// Types
export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;
export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;
export type AuditResult = typeof auditResults.$inferSelect;
export type InsertAuditResult = typeof auditResults.$inferInsert;