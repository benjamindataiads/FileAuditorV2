
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

## Default Rules
The application comes with a set of predefined validation rules:

### Required Fields Category
1. **ID Check**
   - Description: Verifies that the product ID is not empty
   - Criticality: Critical

2. **Title Check**
   - Description: Verifies that the product title is not empty
   - Criticality: Critical

3. **Description Check**
   - Description: Verifies that the product description is not empty
   - Criticality: Critical

4. **Link Check**
   - Description: Verifies that the product link is not empty
   - Criticality: Critical

5. **Image Link Check**
   - Description: Verifies that the product image link is not empty
   - Criticality: Critical

6. **Additional Image Link Check**
   - Description: Verifies that the additional image link is not empty
   - Criticality: Critical

7. **Availability Check**
   - Description: Verifies that the product availability is specified
   - Criticality: Critical

8. **Price Check**
   - Description: Verifies that the product price is not empty
   - Criticality: Critical

9. **Brand Check**
   - Description: Verifies that the product brand is not empty
   - Criticality: Critical

10. **GTIN Check**
    - Description: Verifies that the product GTIN is not empty
    - Criticality: Critical

11. **Google Product Category Check**
    - Description: Verifies that the Google product category is specified
    - Criticality: Critical

12. **Product Type Check**
    - Description: Verifies that the product type is specified
    - Criticality: Critical

13. **Item Group ID Check**
    - Description: Verifies that the item group ID is not empty
    - Criticality: Critical

14. **Color Check**
    - Description: Verifies that the product color is specified
    - Criticality: Critical

15. **Size Check**
    - Description: Verifies that the product size is specified
    - Criticality: Critical

16. **Material Check**
    - Description: Verifies that the product material is specified
    - Criticality: Critical

17. **Age Group Check**
    - Description: Verifies that the age group is specified
    - Criticality: Critical

18. **Gender Check**
    - Description: Verifies that the gender is specified
    - Criticality: Critical

19. **Product Highlight Check**
    - Description: Verifies that product highlights are specified
    - Criticality: Warning

## Environment Variables
The application uses PostgreSQL for data storage. Configure your database connection using the following environment variable:
- `DATABASE_URL`: PostgreSQL connection string

## Deployment
The application is configured for deployment on Replit. The deployment process is handled automatically through Replit's deployment system.
