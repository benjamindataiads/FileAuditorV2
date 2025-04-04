
# Rule Logic Documentation

This document details the exact validation logic for each rule in the product feed audit system.

## Rule Types Overview

All rules have a `criticality` level that can be either:
- `critical`: Failure indicates a serious compliance issue
- `warning`: Failure indicates a recommended improvement

## Validation Logic by Rule Type

### 1. Not Empty Check (`notEmpty`)
Rules: ID Check, Title Check, Description Check, Link Check, Image Link Check, Additional Image Link Check, Availability Check, Price Check, Brand Check, GTIN Check, Google Product Category Check, Product Type Check, Item Group ID Check, Color Check, Size Check, Material Check, Age Group Check, Gender Check, Product Highlight Check

**Logic:**
```typescript
const value = product[field]?.toString()
if (!value || value.trim() === '') {
  return {
    status: rule.criticality,
    message: "Field is empty or contains only whitespace"
  }
}
return {
  status: "ok",
  message: "Field has content"
}
```

### 2. Minimum Length Check (`minLength`)
**Logic:**
```typescript
const value = product[field]?.toString()
const minLength = parseInt(rule.condition.value)
if (!value || value.length < minLength) {
  return {
    status: rule.criticality,
    message: `Field length (${value?.length || 0}) is less than minimum required (${minLength})`
  }
}
return {
  status: "ok",
  message: `Field length (${value.length}) meets minimum requirement`
}
```

### 3. Contains Value Check (`contains`)
**Logic:**
```typescript
const value = product[field]?.toString().toLowerCase()
const searchValue = rule.condition.value.toLowerCase()
if (!value || !value.includes(searchValue)) {
  return {
    status: rule.criticality,
    message: `Field does not contain required value: ${rule.condition.value}`
  }
}
return {
  status: "ok",
  message: "Field contains required value"
}
```

### 4. Regular Expression Check (`regex`)
**Logic:**
```typescript
const value = product[field]?.toString()
const pattern = new RegExp(rule.condition.value)
if (!value || !pattern.test(value)) {
  return {
    status: rule.criticality,
    message: `Field does not match pattern: ${rule.condition.value}`
  }
}
return {
  status: "ok",
  message: "Field matches required pattern"
}
```

### 5. Numerical Range Check (`range`)
**Logic:**
```typescript
const value = parseFloat(product[field])
const range = rule.condition.value
if (isNaN(value) || value < range.min || value > range.max) {
  return {
    status: rule.criticality,
    message: `Value (${value}) is outside allowed range: ${range.min} - ${range.max}`
  }
}
return {
  status: "ok",
  message: `Value is within allowed range`
}
```

### 6. Cross-Field Validation (`crossField`)
**Logic:**
```typescript
const sourceValue = product[field]?.toString()
const targetValue = product[rule.condition.value.field]?.toString()
const operator = rule.condition.value.operator

const operatorLogic = {
  "==": (a, b) => a === b,
  "!=": (a, b) => a !== b,
  "contains": (a, b) => a.includes(b),
  ">": (a, b) => parseFloat(a) > parseFloat(b),
  ">=": (a, b) => parseFloat(a) >= parseFloat(b),
  "<": (a, b) => parseFloat(a) < parseFloat(b),
  "<=": (a, b) => parseFloat(a) <= parseFloat(b)
}

if (!operatorLogic[operator](sourceValue, targetValue)) {
  return {
    status: rule.criticality,
    message: `Field ${field} (${sourceValue}) does not satisfy ${operator} condition with ${rule.condition.value.field} (${targetValue})`
  }
}
return {
  status: "ok",
  message: "Cross-field validation passed"
}
```

### 7. Date Format Validation (`date`)
**Logic:**
```typescript
const value = product[field]
let parsedDate

if (rule.condition.dateFormat === "ISO") {
  parsedDate = new Date(value)
} else {
  const format = rule.condition.dateFormat?.replace("YYYY", "yyyy") || "yyyy-MM-dd"
  parsedDate = dateParse(value, format, new Date())
}

if (isNaN(parsedDate.getTime())) {
  return {
    status: rule.criticality,
    message: `Invalid date format (expected: ${rule.condition.dateFormat || "yyyy-MM-dd"})`
  }
}
return {
  status: "ok",
  message: "Date is valid and matches the specified format"
}
```

## Status Codes

Each validation returns one of three status codes:
- `ok`: The field passes the validation rule
- `warning`: The field fails a non-critical validation rule
- `critical`: The field fails a critical validation rule

## Error Messages
Each validation returns a descriptive message explaining:
1. What was checked
2. Why it failed (if applicable)
3. Expected vs actual values (where relevant)
