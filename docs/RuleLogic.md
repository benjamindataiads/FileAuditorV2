
# Rule Logic Documentation

This document details the exact validation logic for each rule in the product feed audit system.

## Current Rules Database

| ID | Name | Description | Category | Criticality | Validation Type |
|----|------|-------------|-----------|-------------|----------------|
| 1 | ID Check | Verifies that the product ID is not empty | Required Fields | Critical | notEmpty |
| 2 | Title Check | Verifies that the product title is not empty | Required Fields | Critical | notEmpty |
| 3 | Description Check | Verifies that the product description is not empty | Required Fields | Critical | notEmpty |
| 4 | Link Check | Verifies that the product link is not empty | Required Fields | Critical | notEmpty |
| 5 | Image Link Check | Verifies that the product image link is not empty | Required Fields | Critical | notEmpty |
| 6 | Additional Image Link Check | Verifies that the additional image link is not empty | Required Fields | Critical | notEmpty |
| 7 | Availability Check | Verifies that the product availability is specified | Required Fields | Critical | notEmpty |
| 8 | Price Check | Verifies that the product price is not empty | Required Fields | Critical | notEmpty |
| 9 | Brand Check | Verifies that the product brand is not empty | Required Fields | Critical | notEmpty |
| 10 | GTIN Check | Verifies that the product GTIN is not empty | Required Fields | Critical | notEmpty |
| 11 | Google Product Category Check | Verifies that the Google product category is specified | Required Fields | Critical | notEmpty |
| 12 | Product Type Check | Verifies that the product type is specified | Required Fields | Critical | notEmpty |
| 13 | Item Group ID Check | Verifies that the item group ID is not empty | Required Fields | Critical | notEmpty |
| 14 | Color Check | Verifies that the product color is specified | Required Fields | Critical | notEmpty |
| 15 | Size Check | Verifies that the product size is specified | Required Fields | Critical | notEmpty |
| 16 | Material Check | Verifies that the product material is specified | Required Fields | Critical | notEmpty |
| 17 | Age Group Check | Verifies that the age group is specified | Required Fields | Critical | notEmpty |
| 18 | Gender Check | Verifies that the gender is specified | Required Fields | Critical | notEmpty |
| 19 | Product Highlight Check | Verifies that product highlights are specified | Required Fields | Warning | notEmpty |

## Rule Types Overview

All rules have a `criticality` level that can be either:
- `critical`: Failure indicates a serious compliance issue
- `warning`: Failure indicates a recommended improvement

## Validation Logic by Rule Type

### 1. Not Empty Check (`notEmpty`)
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
  message: "Value is within allowed range"
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
