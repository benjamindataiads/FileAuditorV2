import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { rules, audits, auditResults } from "@db/schema";
import type { FieldMapping } from "../client/src/lib/fieldMappings";
import { fieldMappings, validateAndNormalizeFieldName } from "../client/src/lib/fieldMappings";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync";
import { parse as dateParse, isValid } from "date-fns";
import crypto from "crypto";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Get all rules
  app.get("/api/rules", async (_req, res) => {
    try {
      const allRules = await db.query.rules.findMany();
      res.json(allRules);
    } catch (error) {
      console.error('Error fetching rules:', error);
      res.status(500).json({ message: "Failed to fetch rules" });
    }
  });

  // Rules endpoints
  app.post("/api/rules", async (req, res) => {
    try {
      const { name, description, category, condition, criticality } = req.body;
      
      // Basic validation
      if (!name || !description || !category || !criticality) {
        return res.status(400).json({ 
          message: "Missing required fields", 
          details: "All fields (name, description, category, condition, criticality) are required" 
        });
      }

      // Validate condition
      if (!condition || !condition.type || !condition.field) {
        return res.status(400).json({ 
          message: "Invalid rule condition",
          details: "Condition must include type and field"
        });
      }

      // Validate condition type
      if (!["notEmpty", "minLength", "contains", "regex", "range", "crossField", "date"].includes(condition.type)) {
        return res.status(400).json({ 
          message: "Invalid condition type",
          details: "Condition type must be one of: notEmpty, minLength, contains, regex, range, crossField, date"
        });
      }

      // Validate criticality
      if (!["warning", "critical"].includes(criticality)) {
        return res.status(400).json({ 
          message: "Invalid criticality level",
          details: "Criticality must be either 'warning' or 'critical'"
        });
      }

      let processedCondition = { ...condition };

      // Type-specific validation
      switch (condition.type) {
        case "date":
          if (condition.dateFormat && !["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "ISO"].includes(condition.dateFormat)) {
            return res.status(400).json({
              message: "Invalid date format",
              details: "Date format must be one of: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, ISO"
            });
          }
          break;

        case "minLength":
          const minLength = parseInt(condition.value);
          if (isNaN(minLength) || minLength <= 0) {
            return res.status(400).json({ 
              message: "Invalid minimum length",
              details: "Minimum length must be a positive number"
            });
          }
          processedCondition.value = minLength;
          break;
          
        case "contains":
          if (!condition.value || typeof condition.value !== "string") {
            return res.status(400).json({ 
              message: "Invalid contains value",
              details: "Contains condition requires a non-empty string value"
            });
          }
          break;
          
        case "regex":
          try {
            new RegExp(condition.value);
          } catch (e) {
            return res.status(400).json({
              message: "Invalid regex pattern",
              details: "The provided pattern is not a valid regular expression"
            });
          }
          break;
          
        case "range":
          try {
            const range = JSON.parse(condition.value);
            if (!range.min || !range.max || isNaN(range.min) || isNaN(range.max) || range.min >= range.max) {
              throw new Error();
            }
            processedCondition.value = range;
          } catch {
            return res.status(400).json({
              message: "Invalid range",
              details: "Range must be a valid JSON object with min and max numbers, where min < max"
            });
          }
          break;
          
        case "crossField":
          try {
            const crossField = typeof condition.value === 'string' ? 
              JSON.parse(condition.value) : condition.value;
            if (!crossField.field || !crossField.operator || 
                !["==", "!=", "contains", ">", ">=", "<", "<="].includes(crossField.operator)) {
              throw new Error();
            }
            processedCondition.value = crossField;
          } catch {
            return res.status(400).json({
              message: "Invalid cross-field condition",
              details: "Cross-field must specify a field and valid operator (==, !=, >, >=, <, <=)"
            });
          }
          break;
      }

      const rule = await db.insert(rules).values({
        name,
        description,
        category,
        condition: processedCondition,
        criticality,
      }).returning();

      res.json(rule[0]);
    } catch (error) {
      console.error('Error creating rule:', error);
      res.status(500).json({ message: "Failed to create rule" });
    }
  });

  // File upload and audit execution
  app.post("/api/audit", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileContent = req.file.buffer.toString();
    const fileHash = crypto.createHash('md5').update(fileContent).digest('hex');
    
    const parser = csvParse(fileContent, {
      delimiter: '\t',
      columns: true,
    });

    const selectedRules = req.body.rules ? JSON.parse(req.body.rules) : [];
    const products = [];
    
    for await (const record of parser) {
      products.push(record);
    }

    // Create audit record
    const audit = await db.insert(audits).values({
      name: req.body.name || "Unnamed Audit",
      fileHash,
      totalProducts: products.length,
      compliantProducts: 0,
      warningProducts: 0,
      criticalProducts: 0,
    }).returning();

    const auditId = audit[0].id;

    // Execute rules and store results
    for (const product of products) {
      for (const ruleId of selectedRules) {
        const rule = await db.query.rules.findFirst({
          where: eq(rules.id, ruleId)
        });

        if (!rule) continue;

        const result = evaluateRule(product, rule);
        
        await db.insert(auditResults).values({
          auditId,
          ruleId,
          productId: product.id || "unknown",
          status: result.status,
          details: result.details,
        });
      }
    }

    // Update audit counts
    const results = await db.query.auditResults.findMany({
      where: eq(auditResults.auditId, auditId)
    });

    const counts = {
      compliant: results.filter(r => r.status === "ok").length,
      warning: results.filter(r => r.status === "warning").length,
      critical: results.filter(r => r.status === "critical").length,
    };

    await db.update(audits)
      .set({
        compliantProducts: counts.compliant,
        warningProducts: counts.warning,
        criticalProducts: counts.critical,
      })
      .where(eq(audits.id, auditId));

    res.json({ auditId });
  });
  app.delete("/api/rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid rule ID" });
      }

      // First check if the rule exists
      const existingRule = await db.query.rules.findFirst({
        where: eq(rules.id, id)
      });

      if (!existingRule) {
        return res.status(404).json({ message: "Rule not found" });
      }

      // Delete the rule and its associated audit results (cascade)
      const result = await db.delete(rules)
        .where(eq(rules.id, id))
        .returning();

      console.log('Rule deletion result:', result);

      if (!result.length) {
        throw new Error("Delete operation did not return expected result");
      }

      // Double check the deletion
      const verifyDeletion = await db.query.rules.findFirst({
        where: eq(rules.id, id)
      });

      if (verifyDeletion) {
        throw new Error("Rule still exists after deletion");
      }

      res.status(200).json({ 
        message: "Rule deleted successfully",
        deletedRule: result[0]
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      res.status(500).json({ 
        message: "Failed to delete rule",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });


  // Get audit results
  app.get("/api/audits/:id", async (req, res) => {
    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, parseInt(req.params.id)),
      with: {
        results: {
          with: {
            rule: true
          }
        }
      }
    });

    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }

    res.json(audit);
  });

  const httpServer = createServer(app);
  return httpServer;
}

function evaluateRule(product: any, rule: any) {
  const condition = rule.condition;
  let status = "ok";
  let details = "";

  // Helper function to safely get field value with bilingual support
  const getFieldValue = (fieldName: string) => {
    // Try to get value using English field name first
    let value = product[fieldName];
    
    // If not found and it's a known field, try the French equivalent
    if (value === undefined || value === null) {
      // Check if this is a known field mapping
      const mapping = fieldMappings[fieldName];
      if (mapping) {
        // Try the French field name
        value = product[mapping.fr];
      } else {
        // If not found in mappings, check if it was provided in French and get English equivalent
        const englishFieldName = Object.entries(fieldMappings).find(
          ([_, mapping]) => mapping.fr === fieldName
        )?.[0];
        if (englishFieldName) {
          value = product[englishFieldName];
        }
      }
    }
    
    return value === undefined || value === null ? "" : String(value);
  };

  // Helper function for case-insensitive comparison
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

  try {
    const fieldValue = getFieldValue(condition.field);

    switch (condition.type) {
      case "notEmpty":
        if (!fieldValue.trim()) {
          status = rule.criticality;
          details = `Field '${condition.field}' is empty or contains only whitespace`;
        }
        break;

      case "minLength":
        if (fieldValue.length < condition.value) {
          status = rule.criticality;
          details = `Field '${condition.field}' has ${fieldValue.length} characters (minimum required: ${condition.value})`;
        }
        break;

      case "contains":
        const searchValue = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
        const testValue = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase();
        if (!testValue.includes(searchValue)) {
          status = rule.criticality;
          details = `Field '${condition.field}' does not contain '${condition.value}'`;
        }
        break;

      case "date":
        try {
          let parsedDate: Date;
          if (condition.dateFormat === "ISO") {
            parsedDate = new Date(fieldValue);
          } else {
            parsedDate = dateParse(fieldValue, condition.dateFormat || "yyyy-MM-dd", new Date());
          }
          
          if (isNaN(parsedDate.getTime())) {
            status = rule.criticality;
            details = `Field '${condition.field}' is not a valid date in format ${condition.dateFormat || "yyyy-MM-dd"}`;
          }
        } catch (e) {
          status = rule.criticality;
          details = `Field '${condition.field}' has invalid date format`;
        }
        break;

      case "regex":
        try {
          const regex = new RegExp(condition.value, 'i'); // Case insensitive by default
          if (!regex.test(fieldValue)) {
            status = rule.criticality;
            details = `Field '${condition.field}' does not match pattern '${condition.value}'`;
          }
        } catch (e) {
          status = "warning";
          details = `Invalid regex pattern: ${condition.value}`;
        }
        break;

      case "range":
        const num = parseFloat(fieldValue);
        const { min, max } = condition.value;
        if (isNaN(num)) {
          status = rule.criticality;
          details = `Field '${condition.field}' value '${fieldValue}' is not a valid number`;
        } else if (num < min || num > max) {
          status = rule.criticality;
          details = `Field '${condition.field}' value ${num} is not within range ${min}-${max}`;
        }
        break;

      case "crossField":
        const { field: compareFieldName, operator } = condition.value;
        const compareFieldValue = getFieldValue(compareFieldName);
        
        if (!compareValues(fieldValue, compareFieldValue, operator)) {
          const operatorMap = {
            "==": "equal to",
            "!=": "not equal to",
            ">": "greater than",
            ">=": "greater than or equal to",
            "<": "less than",
            "<=": "less than or equal to"
          } as const;

          const operatorText = operatorMap[operator as keyof typeof operatorMap];
          status = rule.criticality;
          details = `Field '${condition.field}' (${fieldValue}) is not ${operatorText} '${compareFieldName}' (${compareFieldValue})`;
        }
        break;
    }
  } catch (error: unknown) {
    status = "warning";
    details = `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return { status, details };
}