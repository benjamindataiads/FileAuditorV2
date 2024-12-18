import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { rules, audits, auditResults } from "@db/schema";
import multer from "multer";
import { parse } from "csv-parse";
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
      if (!["notEmpty", "minLength", "contains"].includes(condition.type)) {
        return res.status(400).json({ 
          message: "Invalid condition type",
          details: "Condition type must be one of: notEmpty, minLength, contains"
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
      if (condition.type === "minLength") {
        const minLength = parseInt(condition.value);
        if (isNaN(minLength) || minLength <= 0) {
          return res.status(400).json({ 
            message: "Invalid minimum length",
            details: "Minimum length must be a positive number"
          });
        }
        processedCondition.value = minLength;
      } else if (condition.type === "contains") {
        if (!condition.value || typeof condition.value !== "string") {
          return res.status(400).json({ 
            message: "Invalid contains value",
            details: "Contains condition requires a non-empty string value"
          });
        }
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
    
    const parser = parse(fileContent, {
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
      await db.delete(rules).where(eq(rules.id, id));
      res.status(200).json({ message: "Rule deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rule" });
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

  switch (condition.type) {
    case "notEmpty":
      if (!product[condition.field]) {
        status = rule.criticality;
        details = `Field ${condition.field} is empty`;
      }
      break;
    case "minLength":
      if (!product[condition.field] || product[condition.field].length < condition.value) {
        status = rule.criticality;
        details = `Field ${condition.field} is shorter than ${condition.value} characters`;
      }
      break;
    case "contains":
      if (!product[condition.field]?.toLowerCase().includes(product[condition.value]?.toLowerCase())) {
        status = rule.criticality;
        details = `Field ${condition.field} does not contain ${condition.value}`;
      }
      break;
  }

  return { status, details };
}