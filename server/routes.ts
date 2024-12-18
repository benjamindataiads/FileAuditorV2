import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { rules, audits, auditResults } from "@db/schema";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rules, audits, auditResults } from "@db/schema";
import { eq } from "drizzle-orm";
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
      res.status(500).json({ message: "Failed to fetch rules" });
    }
  });

  // Rules endpoints
  app.post("/api/rules", async (req, res) => {
    const rule = await db.insert(rules).values(req.body).returning();
    res.json(rule[0]);
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