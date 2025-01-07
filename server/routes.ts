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

// Helper function to validate a single product
async function validateProduct(product: any, selectedRules: any[], columnMapping: Record<string, string>) {
  const results = [];

  // Create a mapped product with our field names
  const mappedProduct: Record<string, any> = {};
  Object.entries(columnMapping).forEach(([fileColumn, appField]) => {
    mappedProduct[appField] = product[fileColumn];
  });

  // Find the ID column once
  const idColumn = Object.entries(columnMapping)
    .find(([_, appField]) => appField.toLowerCase() === 'identifiant')?.[0] || 
    (product.identifiant ? 'identifiant' : null);

  const productId = idColumn && product[idColumn] ? product[idColumn] : 'NO_ID_MAPPED';

  // Process each rule
  for (const rule of selectedRules) {
    if (!rule || !rule.id) continue; // Skip invalid rules

    const result = evaluateRule(mappedProduct, rule);
    results.push({
      productId,
      ruleId: rule.id,
      fieldName: rule.condition.field,
      status: result.status,
      details: result.details,
    });
  }

  return results;
}

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
    console.log('Received rule creation request:', req.body);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
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
      if (!["notEmpty", "minLength", "maxLength", "contains", "doesntContain", "regex", "range", "crossField", "date"].includes(condition.type)) {
        return res.status(400).json({ 
          message: "Invalid condition type",
          details: "Condition type must be one of: notEmpty, minLength, maxLength, contains, doesntContain, regex, range, crossField, date"
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

        case "doesntContain":
          if (!condition.value || typeof condition.value !== "string") {
            return res.status(400).json({ 
              message: "Invalid doesn't contain value",
              details: "Doesn't contain condition requires a non-empty string value"
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ message: `Failed to create rule: ${errorMessage}` });
    }
  });

  // File upload and audit execution
  // Preview validation endpoint
  app.post("/api/preview-validation", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const fileContent = req.file.buffer.toString();
      const selectedRules = req.body.rules ? JSON.parse(req.body.rules) : [];
      const columnMapping = req.body.columnMapping ? JSON.parse(req.body.columnMapping) : {};
      const sampleMode = req.body.sampleMode || "first";

      // First parse all rows to get total count
      const allRows = csvParse(fileContent, {
        delimiter: '\t',
        columns: true,
      });

      const totalRows = allRows.length;
      const sampleSize = 5;

      // Select rows based on sample mode
      let selectedRows: any[] = [];
      switch (sampleMode) {
        case "first":
          selectedRows = allRows.slice(0, sampleSize);
          break;
        case "last":
          selectedRows = allRows.slice(Math.max(0, totalRows - sampleSize));
          break;
        case "random":
          // Get unique random indices
          const indices = new Set<number>();
          while (indices.size < Math.min(sampleSize, totalRows)) {
            indices.add(Math.floor(Math.random() * totalRows));
          }
          selectedRows = Array.from(indices).map(index => allRows[index]);
          break;
      }

      const results = [];

      for (const record of selectedRows) {
        const productResults = await validateProduct(record, selectedRules, columnMapping);
        results.push(...productResults);
      }

      res.json({
        totalProducts: selectedRows.length,
        results,
      });
    } catch (error) {
      console.error('Preview validation error:', error);
      res.status(500).json({ message: "Failed to preview validation" });
    }
  });

  app.post("/api/audit", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    const CHUNK_SIZE = 1000; // Process 1000 records at a time
    let processedCount = 0;
    let currentChunk: any[] = [];
    
    // Get total number of rows
    const totalRows = csvParse(req.file.buffer, {
      delimiter: '\t',
      columns: true,
      skip_empty_lines: true,
    }).length;

    const parser = csvParse(req.file.buffer, {
      delimiter: '\t',
      columns: true,
      skip_empty_lines: true,
    });

    const selectedRules = req.body.rules ? JSON.parse(req.body.rules) : [];
    const columnMapping = req.body.columnMapping ? JSON.parse(req.body.columnMapping) : {};


    // Create audit record
    const audit = await db.insert(audits).values({
      name: req.body.name || "Unnamed Audit",
      fileHash,
      totalProducts: 0, // Initialize to 0, will be updated later
      compliantProducts: 0,
      warningProducts: 0,
      criticalProducts: 0,
    }).returning();

    const auditId = audit[0].id;

    // Load all rules at once
    const rules = await loadRules(selectedRules);

    let processedResults = 0;

    for await (const record of parser) {
      currentChunk.push(record);

      if (currentChunk.length >= CHUNK_SIZE) {
        const results = await processChunk(currentChunk, rules, columnMapping, auditId);
        processedCount += currentChunk.length;
        processedResults += results.length;

        // Update progress in audit record
        const progress = Math.round((processedCount / totalRows) * 100);
        await db.update(audits)
          .set({ 
            totalProducts: processedCount,
            progress: progress 
          })
          .where(eq(audits.id, auditId));

        // Clear chunk from memory
        currentChunk = [];
      }
    }

    // Process remaining records
    if (currentChunk.length > 0) {
      await processChunk(currentChunk, rules, columnMapping, auditId);
      processedCount += currentChunk.length;
    }

    async function processChunk(chunk: any[], rules: any[], columnMapping: any, auditId: number) {
      const results = await Promise.all(
        chunk.map(product => validateProduct(product, rules, columnMapping))
      );

      const flatResults = results.flat().filter(r => r.ruleId);
      if (flatResults.length > 0) {
        await insertResultsBatch(flatResults, auditId);
      }

      return flatResults;
    }

    // Update audit counts
    const auditResultsData = await db.query.auditResults.findMany({
      where: eq(auditResults.auditId, auditId)
    });

    console.log('Audit results after processing:', {
      auditId,
      totalResults: auditResultsData.length,
      results: auditResultsData.slice(0, 5) // Log first 5 results for debugging
    });

    const counts = {
      compliant: auditResultsData.filter(r => r.status === "ok").length,
      warning: auditResultsData.filter(r => r.status === "warning").length,
      critical: auditResultsData.filter(r => r.status === "critical").length,
    };

    await db.update(audits)
      .set({
        compliantProducts: counts.compliant,
        warningProducts: counts.warning,
        criticalProducts: counts.critical,
        totalProducts: processedCount, // Update totalProducts after processing
      })
      .where(eq(audits.id, auditId));

    res.json({ auditId });
  });
  app.delete("/api/audits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid audit ID" });
      }

      await db.delete(auditResults).where(eq(auditResults.auditId, id));
      await db.delete(audits).where(eq(audits.id, id));

      res.json({ message: "Audit deleted successfully" });
    } catch (error) {
      console.error('Error deleting audit:', error);
      res.status(500).json({ message: "Failed to delete audit" });
    }
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
  // Get all audits
  app.get("/api/audits", async (_req, res) => {
    try {
      const allAudits = await db.query.audits.findMany({
        orderBy: (audits, { desc }) => [desc(audits.createdAt)],
      });
      res.json(allAudits);
    } catch (error) {
      console.error('Error fetching audits:', error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    const audit = await db.query.audits.findFirst({
      where: eq(audits.id, parseInt(req.params.id))
    });

    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }

    const results = await db.query.auditResults.findMany({
      where: eq(auditResults.auditId, audit.id),
      with: {
        rule: true
      },
      limit: limit,
      offset: offset,
      orderBy: (results, { asc }) => [asc(results.productId)]
    });

    const totalResults = await db.select({ count: sql`count(*)` })
      .from(auditResults)
      .where(eq(auditResults.auditId, audit.id));

    res.json({
      ...audit,
      results,
      pagination: {
        total: totalResults[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalResults[0].count / limit)
      }
    });
  });

  app.post("/api/audits/:id/rerun", async (req, res) => {
    const oldAudit = await db.query.audits.findFirst({
      where: eq(audits.id, parseInt(req.params.id)),
      with: {
        results: {
          with: {
            rule: true
          }
        }
      }
    });

    if (!oldAudit) {
      return res.status(404).json({ message: "Audit not found" });
    }

    // Create new audit with same rules
    const ruleIds = [...new Set(oldAudit.results?.map(r => r.ruleId))].filter(Boolean);
    const rules = await loadRules(ruleIds);

    if (!rules || rules.length === 0) {
      // Use original results if no rules found
      const results = oldAudit.results || [];
      if (results.length === 0) {
        return res.status(400).json({ message: "No results found for this audit" });
      }
      rules.push(...results.map(r => r.rule).filter(Boolean));
    }

    // Get all unique products from old audit
    const products = [...new Set(oldAudit.results?.map(r => ({
      id: r.productId,
      // Add any other fields from the original product
    })))];

    // Create new audit entry
    const newAudit = await db.insert(audits).values({
      name: `${oldAudit.name} (Rerun)`,
      fileHash: oldAudit.fileHash,
      totalProducts: products.length,
      compliantProducts: 0,
      warningProducts: 0,
      criticalProducts: 0,
    }).returning();

    const auditId = newAudit[0].id;
    const batchPromises = [];

    // Reuse the original audit results to maintain consistency
    const results = oldAudit.results?.map(r => ({
      auditId,
      ruleId: r.ruleId,
      productId: r.productId,
      status: r.status,
      details: r.details,
      fieldName: r.fieldName
    })) || [];

    // Process in batches
    for (let i = 0; i < results.length; i += 100) {
      const batch = results.slice(i, i + 100);
      batchPromises.push(insertResultsBatch(batch, auditId));
    }

    await Promise.all(batchPromises);

    // Update audit counts
    const auditResultsData = await db.query.auditResults.findMany({
      where: eq(auditResults.auditId, auditId)
    });

    console.log('Audit results after processing:', {
      auditId,
      totalResults: auditResultsData.length,
      results: auditResultsData.slice(0, 5) // Log first 5 results for debugging
    });

    const counts = {
      compliant: auditResultsData.filter(r => r.status === "ok").length,
      warning: auditResultsData.filter(r => r.status === "warning").length,
      critical: auditResultsData.filter(r => r.status === "critical").length,
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

  const httpServer = createServer(app);
  return httpServer;
}

async function loadRules(ruleIds: number[]): Promise<any[]> {
  const loadedRules = await db.query.rules.findMany({
    where: (rules, { inArray }) => inArray(rules.id, ruleIds)
  });
  return loadedRules.filter(rule => rule && rule.id);
}

async function insertResultsBatch(results: any[], auditId: number): Promise<void> {
    const INSERTION_CHUNK_SIZE = 100;
    const validResults = results.filter(result => 
      result && 
      result.ruleId && 
      result.productId && 
      result.status
    );

    if (validResults.length === 0) return;

    // Process in smaller chunks
    for (let i = 0; i < validResults.length; i += INSERTION_CHUNK_SIZE) {
        const chunk = validResults.slice(i, i + INSERTION_CHUNK_SIZE);
        const resultsWithAuditId = chunk.map(result => ({
            auditId,
            ruleId: result.ruleId,
            productId: result.productId,
            status: result.status,
            details: result.details || null,
            fieldName: result.fieldName
        }));

        await db.insert(auditResults).values(resultsWithAuditId);
    }
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
      console.log(`Evaluating rule for field '${condition.field}':`, {
        rawValue: fieldValue,
        trimmedValue: fieldValue.trim(),
        condition: condition,
      });

      switch (condition.type) {
        case "notEmpty":
          const trimmedValue = String(fieldValue).trim();
          if (!trimmedValue || trimmedValue.length === 0) {
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

        case "maxLength":
          if (fieldValue.length > condition.value) {
            status = rule.criticality;
            details = `Field '${condition.field}' has ${fieldValue.length} characters (maximum allowed: ${condition.value})`;
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

        case "doesntContain":
          const searchValue2 = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
          const testValue2 = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase();
          if (testValue2.includes(searchValue2)) {
            status = rule.criticality;
            details = `Field '${condition.field}' contains forbidden value '${condition.value}'`;
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