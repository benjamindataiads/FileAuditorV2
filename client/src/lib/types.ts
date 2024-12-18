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
  type: "notEmpty" | "minLength" | "contains" | "regex" | "range" | "crossField" | "date";
  field: string;
  value?: any;
  caseSensitive?: boolean;
  dateFormat?: string;
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
