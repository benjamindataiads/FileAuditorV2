import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, sql } from "drizzle-orm";
import { db } from "@db";
import { rules, audits, auditResults } from "@db/schema";
import type { FieldMapping } from "../client/src/lib/fieldMappings";
import { fieldMappings, validateAndNormalizeFieldName } from "../client/src/lib/fieldMappings";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync";
import { parse as dateParse, isValid } from "date-fns";
import crypto from "crypto";
import { cleanField, cleanTsvContent, validateTsvStructure } from "./utils/csvCleaner";
import { Readable } from 'stream';
import { stringify } from 'csv-stringify/sync';

const upload = multer({ storage: multer.memoryStorage() });

// Add this function before registerRoutes
async function processChunk(results: any[], auditId: number) {
  try {
    // Filter out invalid results
    const validResults = results.filter(result => 
      result && 
      result.ruleId && 
      result.productId && 
      result.status
    );

    if (validResults.length === 0) {
      return [];
    }

    // Process in batches of 100
    const BATCH_SIZE = 100;
    const batches = [];
    
    for (let i = 0; i < validResults.length; i += BATCH_SIZE) {
      const batch = validResults.slice(i, i + BATCH_SIZE).map(result => ({
        auditId,
        ruleId: result.ruleId,
        productId: result.productId,
        status: result.status,
        details: result.details || null,
        fieldName: result.fieldName
      }));

      // Insert batch into database
      const insertedResults = await db.insert(auditResults)
        .values(batch)
        .returning();
      
      batches.push(...insertedResults);
    }

    return batches;
  } catch (error) {
    console.error('Error processing chunk:', error);
    throw error;
  }
}

// Helper function to validate a single product
async function validateProduct(product: any, selectedRules: any[], columnMapping: Record<string, string>) {
  const results = [];
  console.log(`Processing product with rules:`, {
    productId: product.identifiant || 'NO_ID',
    ruleCount: selectedRules.length,
    rules: selectedRules.map(r => r.id)
  });

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
    try {
      const fileContent = req.file.buffer.toString('utf-8');
      const columnMapping = JSON.parse(req.body.columnMapping);
      
      // Validate TSV structure first
      const validation = validateTsvStructure(fileContent);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid file structure',
          details: validation.error
        });
      }

      // Clean the content before parsing
      const cleanContent = cleanTsvContent(fileContent);

      let allRows;
      try {
        // Parse with more robust options
        allRows = csvParse(cleanContent, {
          delimiter: '\t',
          columns: true,
          quote: '"',
          escape: '\\',
          skip_empty_lines: true,
          relax_column_count: true,
          relax_quotes: true,
          trim: true,
          skip_records_with_error: true,
          relaxColumnCount: true,
          relaxQuotes: true,
          bom: true,
          on_record: (record, context) => {
            // Additional per-record cleaning
            Object.keys(record).forEach(key => {
              if (typeof record[key] === 'string') {
                try {
                  record[key] = cleanField(record[key]);
                } catch (error) {
                  console.warn('Error cleaning record field:', { key, error });
                }
              }
            });
            return record;
          },
          on_error: (error) => {
            console.warn('CSV parsing warning:', {
              error: error.code,
              line: error.lines,
              field: error.column,
              message: error.message
            });
            return true;
          }
        });
      } catch (error: any) {
        // If we still get an error, try to recover the data
        if (error.code === 'CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE') {
          console.warn('Attempting to recover from CSV parsing error');
          
          // Split into lines and process each line individually
          const lines = cleanContent.split('\n');
          const headers = lines[0].split('\t');
          
          allRows = lines.slice(1).map((line, index) => {
            try {
              const fields = line.split('\t').map(cleanField);
              return headers.reduce((acc, header, i) => {
                acc[header] = fields[i] || '';
                return acc;
              }, {} as Record<string, string>);
            } catch (lineError) {
              console.warn('Error processing line:', { lineNumber: index + 1, error: lineError });
              return null;
            }
          }).filter(row => row !== null);
        } else {
          throw error;
        }
      }

      const totalRows = allRows?.length || 0;
      console.log(`Successfully parsed ${totalRows} rows`);

      const selectedRules = req.body.rules ? JSON.parse(req.body.rules) : [];

      // Debug column mapping
      console.log('Received column mapping:', {
        raw: req.body.columnMapping,
        parsed: columnMapping,
        hasIdentifiant: Object.values(columnMapping).includes('identifiant'),
        mappingEntries: Object.entries(columnMapping)
      });

      // Create audit record
      const audit = await db.insert(audits).values({
        name: req.body.name || "Unnamed Audit",
        fileHash: crypto.createHash('md5').update(req.file.buffer).digest('hex'),
        totalProducts: totalRows,
        compliantProducts: 0,
        warningProducts: 0,
        criticalProducts: 0,
        fileContent: fileContent,
        columnMapping: columnMapping,
      }).returning();

      console.log('New audit created:', audit[0]);

      const auditId = audit[0].id;

      // Load all rules at once
      const rules = await loadRules(selectedRules);

      // Update total rules count
      await db.update(audits)
        .set({ totalRules: rules.length * totalRows })
        .where(eq(audits.id, auditId));

      let processedResults = 0;

      // Process rows in batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        const batchResults = [];
        
        for (const record of batch) {
          const productResults = await validateProduct(record, rules, columnMapping);
          batchResults.push(...productResults);
        }

        const results = await processChunk(batchResults, auditId);
        processedResults += results.length;

        const progress = Math.floor((processedResults / (rules.length * totalRows)) * 100);
        console.log(`Progress: ${progress}% (${processedResults}/${rules.length * totalRows} rules processed)`);
        
        await db.update(audits)
          .set({ 
            progress: progress,
            rulesProcessed: processedResults,
          })
          .where(eq(audits.id, auditId));
      }

      // Update final audit counts
      const auditResultsData = await db.query.auditResults.findMany({
        where: eq(auditResults.auditId, auditId)
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
          progress: 100,
        })
        .where(eq(audits.id, auditId));

      console.log('Final audit counts:', {
        compliant: counts.compliant,
        warning: counts.warning,
        critical: counts.critical
      });

      res.json({ auditId });
    } catch (error: any) {
      console.error('Audit processing error:', error);
      res.status(500).json({
        error: 'Failed to process audit',
        details: error.message
      });
    }
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
      const allAudits = await db.execute(sql`
        SELECT 
          id, 
          name, 
          file_hash,
          total_products,
          compliant_products,
          warning_products,
          critical_products,
          progress,
          created_at::text as created_at,
          rules_processed,
          total_rules,
          error_count
        FROM audits
        ORDER BY created_at DESC
      `);

      // Add a flag to indicate if this is a legacy audit
      const auditsWithLegacyFlag = allAudits.rows.map(audit => ({
        ...audit,
        createdAt: audit.created_at,
        isLegacy: true,
        canReprocess: false
      }));

      res.json(auditsWithLegacyFlag);
    } catch (error) {
      console.error('Error fetching audits:', error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  // Add this helper function to transform results into the new format
  function transformResultsForExport(results: any[], originalIdColumn: string = 'identifiant') {
    if (!results || results.length === 0) {
      return [];
    }

    // Group results by product ID and collect all rule evaluations
    const groupedResults = results.reduce((acc, result) => {
      const productId = result.productId;
      if (!acc[productId]) {
        acc[productId] = {
          [originalIdColumn]: productId, // Use the original column name from the file
          rules: {}
        };
      }
      // Store rule evaluation under the rule name
      if (result.rule?.name) {
        const ruleName = result.rule.name
          .trim()
          .replace(/[\t\n\r]/g, ' ')
          .replace(/\s+/g, ' ');
        acc[productId].rules[ruleName] = result.status;
      }
      return acc;
    }, {});

    // Convert to array and format for CSV
    const products = Object.values(groupedResults);
    
    // Get all unique rule names
    const ruleNames = [...new Set(results
      .map(r => r.rule?.name)
      .filter(Boolean)
      .map(name => name.trim().replace(/[\t\n\r]/g, ' ').replace(/\s+/g, ' '))
    )].sort();
    
    // Transform each product into a flat object
    return products.map((product: any) => {
      const row: any = { 
        [originalIdColumn]: product[originalIdColumn] // Use the original column name from the file
      };
      ruleNames.forEach(ruleName => {
        if (ruleName) {
          row[ruleName] = product.rules[ruleName] || 'not_evaluated';
        }
      });
      return row;
    });
  }

  // Update the export endpoint
  app.get("/api/audits/:id/export", async (req, res) => {
    try {
      const auditId = parseInt(req.params.id);
      
      // Vérifiez que l'audit existe
      const audit = await db.query.audits.findFirst({
        where: eq(audits.id, auditId)
      });

      if (!audit) {
        return res.status(404).json({ message: "Audit not found" });
      }

      // Récupérez tous les résultats avec les règles associées
      const results = await db
        .select({
          productId: auditResults.productId,
          status: auditResults.status,
          details: auditResults.details,
          ruleName: rules.name,
        })
        .from(auditResults)
        .leftJoin(rules, eq(auditResults.ruleId, rules.id))
        .where(eq(auditResults.auditId, auditId));

      // Organisez les résultats par produit
      const productResults = new Map<string, Map<string, string>>();
      const ruleNames = new Set<string>();

      // Regroupez les résultats par produit et collectez les noms de règles
      results.forEach(result => {
        if (!result.ruleName) return;
        
        if (!productResults.has(result.productId)) {
          productResults.set(result.productId, new Map());
        }
        
        const formattedValue = result.details 
          ? `${result.status}: ${result.details}`
          : result.status;
          
        productResults.get(result.productId)!.set(result.ruleName, formattedValue);
        ruleNames.add(result.ruleName);
      });

      // Préparez les données pour le TSV
      const sortedRuleNames = Array.from(ruleNames).sort();
      const rows = [
        ['Product ID', ...sortedRuleNames]
      ];

      // Ajoutez les données de chaque produit
      for (const [productId, ruleResults] of productResults) {
        const row = [productId];
        for (const ruleName of sortedRuleNames) {
          row.push(ruleResults.get(ruleName) || 'N/A');
        }
        rows.push(row);
      }

      // Convertissez en TSV
      const tsvContent = stringify(rows, { 
        delimiter: '\t',
        quoted: true,
        record_delimiter: 'windows'
      });

      // Définissez les en-têtes de réponse
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${auditId}-results.tsv"`);
      
      // Envoyez le contenu
      res.send(tsvContent);

    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export audit results' });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    try {
      const audit = await db.execute(sql`
        SELECT 
          id, 
          name, 
          file_hash as "fileHash",
          total_products as "totalProducts",
          compliant_products as "compliantProducts",
          warning_products as "warningProducts",
          critical_products as "criticalProducts",
          progress,
          created_at as "createdAt",
          rules_processed as "rulesProcessed",
          total_rules as "totalRules",
          error_count as "errorCount"
        FROM audits
        WHERE id = ${parseInt(req.params.id)}
      `);

      console.log('Audit data from database:', audit.rows[0]);

      if (!audit.rows[0]) {
        return res.status(404).json({ message: "Audit not found" });
      }

      const auditData = {
        ...audit.rows[0],
        isLegacy: true,
        canReprocess: false
      };

      const results = await db.query.auditResults.findMany({
        where: eq(auditResults.auditId, auditData.id),
        with: {
          rule: true
        },
        limit: limit,
        offset: offset,
        orderBy: (results, { asc }) => [asc(results.productId)]
      });

      const totalResults = await db.select({ count: sql`count(*)` })
        .from(auditResults)
        .where(eq(auditResults.auditId, auditData.id));

      res.json({
        ...auditData,
        totalProducts: Number(auditData.totalProducts),
        compliantProducts: Number(auditData.compliantProducts),
        warningProducts: Number(auditData.warningProducts),
        criticalProducts: Number(auditData.criticalProducts),
        results,
        pagination: {
          total: totalResults[0].count,
          page,
          limit,
          totalPages: Math.ceil(totalResults[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit:', error);
      res.status(500).json({ message: "Failed to fetch audit" });
    }
  });

  app.post("/api/audits/:id/reprocess", async (req, res) => {
    try {
      // Get the original audit
      const originalAudit = await db.query.audits.findFirst({
        where: eq(audits.id, parseInt(req.params.id)),
      });

      if (!originalAudit || !originalAudit.fileContent || !originalAudit.columnMapping) {
        return res.status(404).json({ 
          message: "Audit not found or missing required data" 
        });
      }

      // Parse the selected rules from the request
      const selectedRules = req.body.rules || [];

      // Create new audit record
      const newAudit = await db.insert(audits).values({
        name: `${originalAudit.name} (Reprocessed)`,
        fileHash: originalAudit.fileHash,
        totalProducts: originalAudit.totalProducts,
        compliantProducts: 0,
        warningProducts: 0,
        criticalProducts: 0,
        fileContent: originalAudit.fileContent,
        columnMapping: originalAudit.columnMapping,
      }).returning();

      const auditId = newAudit[0].id;

      // Parse the file content
      const allRows = csvParse(originalAudit.fileContent, {
        delimiter: '\t',
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
      });

      // Load rules
      const rules = await loadRules(selectedRules);

      // Update total rules count
      await db.update(audits)
        .set({ totalRules: rules.length * allRows.length })
        .where(eq(audits.id, auditId));

      // Process rows in batches
      const BATCH_SIZE = 100;
      let compliant = 0;
      let warning = 0;
      let critical = 0;

      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        const batchResults = [];
        
        for (const record of batch) {
          const productResults = await validateProduct(
            record, 
            rules, 
            originalAudit.columnMapping
          );
          batchResults.push(...productResults);
        }

        // Process results
        await processChunk(batchResults, auditId);

        // Update counters
        for (const result of batchResults) {
          switch (result.status) {
            case "ok": compliant++; break;
            case "warning": warning++; break;
            case "critical": critical++; break;
          }
        }
      }

      // Update final statistics
      await db.update(audits)
        .set({
          compliantProducts: compliant,
          warningProducts: warning,
          criticalProducts: critical,
        })
        .where(eq(audits.id, auditId));

      res.json({ 
        message: "Audit reprocessed successfully", 
        auditId: auditId 
      });

    } catch (error) {
      console.error('Error reprocessing audit:', error);
      res.status(500).json({ 
        message: "Failed to reprocess audit",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/audits/:id/rule-stats", async (req, res) => {
    try {
      const auditId = parseInt(req.params.id);
      
      const ruleStats = await db.execute<{
        rule: string;
        ok: number;
        warning: number;
        critical: number;
      }>(sql`
        WITH rule_counts AS (
          SELECT 
            r.name as rule,
            ar.status,
            COUNT(DISTINCT ar.product_id)::float as count,
            CAST(
              (COUNT(DISTINCT ar.product_id)::float * 100.0) / 
              NULLIF(SUM(COUNT(DISTINCT ar.product_id)) OVER (PARTITION BY r.name), 0)
              AS DECIMAL(10,1)
            ) as percentage
          FROM audit_results ar
          JOIN rules r ON ar.rule_id = r.id
          WHERE ar.audit_id = ${auditId}
          GROUP BY r.name, ar.status
        )
        SELECT 
          rule,
          COALESCE(MAX(CASE WHEN status = 'ok' THEN percentage END), 0.0) as ok,
          COALESCE(MAX(CASE WHEN status = 'warning' THEN percentage END), 0.0) as warning,
          COALESCE(MAX(CASE WHEN status = 'critical' THEN percentage END), 0.0) as critical
        FROM rule_counts
        GROUP BY rule
        ORDER BY rule
      `);

      res.json(ruleStats.rows || []);
    } catch (error) {
      console.error('Error fetching rule statistics:', error);
      res.status(500).json({ message: "Failed to fetch rule statistics" });
    }
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

// Add cache for compiled regex patterns
const regexCache = new Map<string, RegExp>();

// Add cache for field mappings
const fieldMappingCache = new Map<string, string>();

function compareValues(value1: string, value2: string, operator: string): boolean {
  // Convert values to strings and normalize for comparison
  const v1 = String(value1).toLowerCase();
  const v2 = String(value2).toLowerCase();

  try {
    switch (operator) {
      case "==":
        return v1 === v2;
      case "!=":
        return v1 !== v2;
      case "contains":
        return v1.includes(v2);
      case ">": {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        return !isNaN(num1) && !isNaN(num2) && num1 > num2;
      }
      case ">=": {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        return !isNaN(num1) && !isNaN(num2) && num1 >= num2;
      }
      case "<": {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        return !isNaN(num1) && !isNaN(num2) && num1 < num2;
      }
      case "<=": {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        return !isNaN(num1) && !isNaN(num2) && num1 <= num2;
      }
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  } catch (error) {
    console.error('Error comparing values:', error);
    return false;
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

      case "crossField": {
        const { field: compareFieldName, operator } = condition.value;
        const compareFieldValue = getFieldValue(compareFieldName);

        if (compareFieldValue === undefined) {
          status = rule.criticality;
          details = `Comparison field '${compareFieldName}' not found`;
          break;
        }

        try {
          const result = compareValues(fieldValue, compareFieldValue, operator);
          if (!result) {
            status = rule.criticality;
            const operatorDisplay = {
              "==": "equal to",
              "!=": "not equal to",
              "contains": "containing",
              ">": "greater than",
              ">=": "greater than or equal to",
              "<": "less than",
              "<=": "less than or equal to"
            }[operator] || operator;

            details = `Field '${condition.field}' (${fieldValue}) is not ${operatorDisplay} '${compareFieldName}' (${compareFieldValue})`;
          }
        } catch (error) {
          status = rule.criticality;
          details = `Error comparing fields: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        break;
      }
    }

    console.log(`Rule evaluation result:`, { status, details });
    return { status, details };
  } catch (error: unknown) {
    status = "warning";
    details = `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return { status, details };
  }
}