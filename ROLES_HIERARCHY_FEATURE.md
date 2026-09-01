# Professional Employee Roles & Hierarchy Feature

## Overview
Added comprehensive professional employee roles with hierarchy management system.

## New Features

### 1. Professional Role Categories
- **Executive**: C-level executives (CEO, CTO, CFO, COO)
- **Senior Management**: VP, Director
- **Management**: Managers, Team Leads
- **Engineering**: Software Engineers (Principal to Junior), DevOps, QA
- **Design**: UI/UX Designers, Graphic Designers
- **Product**: Product Managers
- **Business**: Business Analysts
- **Marketing**: Marketing Managers & Specialists
- **Sales**: Sales Managers & Executives
- **HR**: HR Managers & Specialists
- **Operations**: Operations Managers
- **Finance**: Finance Managers, Accountants
- **Support**: Customer Support
- **Entry Level**: Interns, Trainees

### 2. Role Hierarchy System
Each designation now includes:
- **Level** (1-10): Indicates seniority (10 = highest)
- **Category**: Groups similar roles together
- **Description**: Clear role responsibilities

## Database Changes

### Designation Model Updates
```javascript
{
  name: String,        // Role name
  description: String, // Role description
  level: Number,       // Hierarchy level (1-10)
  category: String,    // Role category
}
```

## New API Endpoints

### Get Designations by Category
```
GET /api/designations/hierarchy/categories
```
Returns designations grouped by category, sorted by hierarchy level.

**Response:**
```json
{
  "success": true,
  "categories": {
    "Executive": [...],
    "Engineering": [...],
    "Management": [...]
  }
}
```

## How to Seed Professional Roles

Run the following command to populate the database with 40+ professional roles:

```bash
cd backend
node seedRoles.js
```

This will:
1. Clear existing designations
2. Add 40+ professional roles with proper hierarchy
3. Set appropriate levels and categories

## Usage Examples

### 1. Create Employee with Professional Role
```javascript
{
  "firstName": "John",
  "lastName": "Doe",
  "designation": "Senior Software Engineer",
  "department": "...",
  "salary": 120000
}
```

### 2. Get All Designations (Sorted by Level)
```
GET /api/designations
```
Returns all roles sorted by hierarchy level (highest first).

### 3. View Organization Hierarchy
```
GET /api/designations/hierarchy/categories
```
Returns roles grouped by department/category for org chart visualization.

## Benefits

1. **Real-world Roles**: Professional titles matching industry standards
2. **Clear Hierarchy**: Level-based structure for reporting and permissions
3. **Better Organization**: Category grouping for department management
4. **Scalable**: Easy to add new roles and categories
5. **Reporting**: Generate org charts and hierarchy reports

## Role Levels Guide

- **Level 10**: C-Level Executives
- **Level 9**: Vice Presidents
- **Level 8**: Directors, Principal Engineers
- **Level 7**: Senior Managers, Lead Designers
- **Level 6**: Managers, Senior Engineers
- **Level 5**: Engineers, Specialists
- **Level 4**: Associates, Team Members
- **Level 3**: Junior Staff, Support
- **Level 2**: Trainees
- **Level 1**: Interns
