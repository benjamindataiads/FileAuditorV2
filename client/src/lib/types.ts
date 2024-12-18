export interface Rule {
  id: number;
  name: string;
  description: string;
  category: string;
  condition: RuleCondition;
  criticality: "warning" | "critical";
  createdAt: string;
}

export interface RuleCondition {
  type: "notEmpty" | "minLength" | "contains";
  field: string;
  value?: any;
}

export interface Audit {
  id: number;
  name: string;
  fileHash: string;
  totalProducts: number;
  compliantProducts: number;
  warningProducts: number;
  criticalProducts: number;
  createdAt: string;
  results?: AuditResult[];
}

export interface AuditResult {
  id: number;
  auditId: number;
  ruleId: number;
  productId: string;
  status: "ok" | "warning" | "critical";
  details?: string;
  rule?: Rule;
}
