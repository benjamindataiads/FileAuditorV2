
# Product Feed Audit Tool

A web application dedicated to auditing product feed files with customizable validation rules and detailed compliance reporting.

## Features

### 1. Rule Library
- Centralized library of reusable rule templates
- Rule categorization by use cases
- Common validation rules:
  - Empty field checks
  - Minimum/maximum length validation
  - Cross-field validation
  - Regular expression patterns
  - Date format validation
  - Range checks
- Rule creation wizard with intuitive interface
- Rule criticality levels (Warning/Critical)

### 2. File Processing
- Support for TSV (Tab-Separated Values) files
- Automatic column mapping
- Large file handling (up to 500MB)
- Sample data mode for testing
- Progress tracking during processing

### 3. Audit Execution
- Multi-rule validation
- Real-time progress tracking
- Detailed result analysis
- Export capabilities (TSV format)
- Reprocessing capability

### 4. Analysis & Visualization
- Product compliance statistics
- Rule-specific performance metrics
- Status distribution (OK/Warning/Critical)
- Global compliance scoring
- Historical audit tracking

## Database Schema

### Rules Table
```sql
- id (serial, primary key)
- name (text)
- description (text)
- category (text)
- condition (jsonb)
- criticality (text)
- created_at (timestamp)
```

### Audits Table
```sql
- id (serial, primary key)
- name (text)
- file_hash (text)
- total_products (integer)
- compliant_products (integer)
- warning_products (integer)
- critical_products (integer)
- progress (integer)
- rules_processed (integer)
- total_rules (integer)
- error_count (integer)
- created_at (timestamp)
- file_content (text)
- column_mapping (json)
```

### Audit Results Table
```sql
- id (serial, primary key)
- audit_id (integer, foreign key)
- rule_id (integer, foreign key)
- product_id (text)
- status (text)
- details (text)
```

## Tech Stack
- Frontend: React + TypeScript
- Backend: Express.js
- Database: PostgreSQL
- UI Framework: Tailwind CSS + Radix UI
- State Management: TanStack Query
- File Processing: csv-parse

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables
The application uses PostgreSQL for data storage. Configure your database connection using the following environment variable:
- `DATABASE_URL`: PostgreSQL connection string

## Deployment
The application is configured for deployment on Replit. The deployment process is handled automatically through Replit's deployment system.
