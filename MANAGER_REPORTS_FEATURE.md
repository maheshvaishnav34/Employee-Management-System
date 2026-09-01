# Manager Role - Reports Feature Documentation

## Overview
Manager role ab system mein fully functional hai with comprehensive reporting capabilities.

## Manager Role Permissions

Manager role ke paas ab ye features hain:
- ✅ Employee reports generate kar sakte hain
- ✅ Attendance reports dekh sakte hain
- ✅ Leave reports dekh sakte hain
- ✅ Department-wise statistics dekh sakte hain

## API Endpoints for Manager

### 1. Employee Report
```
GET /api/reports/employees
```

**Access**: Admin, HR, Manager

**Query Parameters**:
- `department`: Department ID (optional)
- `status`: Active/Inactive (optional)
- `startDate`: Joining date range start (optional)
- `endDate`: Joining date range end (optional)

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalEmployees": 12,
    "activeEmployees": 10,
    "inactiveEmployees": 2,
    "averageSalary": 4850
  },
  "employees": [...]
}
```

### 2. Attendance Report
```
GET /api/reports/attendance
```

**Access**: Admin, HR, Manager

**Query Parameters**:
- `department`: Department ID (optional)
- `employeeId`: Specific employee (optional)
- `startDate`: Date range start (optional)
- `endDate`: Date range end (optional)

**Default**: Current month ka data

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalRecords": 150,
    "present": 135,
    "absent": 10,
    "halfDay": 5,
    "late": 20,
    "attendanceRate": "90.00"
  },
  "records": [...]
}
```

### 3. Leave Report
```
GET /api/reports/leaves
```

**Access**: Admin, HR, Manager

**Query Parameters**:
- `department`: Department ID (optional)
- `employeeId`: Specific employee (optional)
- `status`: Pending/Approved/Rejected (optional)
- `startDate`: Date range start (optional)
- `endDate`: Date range end (optional)

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalRequests": 25,
    "approved": 18,
    "pending": 5,
    "rejected": 2,
    "totalDays": 42
  },
  "leaveTypeBreakdown": {
    "Sick": 8,
    "Casual": 12,
    "Annual": 5
  },
  "requests": [...]
}
```

### 4. Department Statistics
```
GET /api/reports/departments
```

**Access**: Admin, HR, Manager

**Response**:
```json
{
  "success": true,
  "statistics": [
    {
      "department": {
        "id": "...",
        "name": "Engineering",
        "description": "..."
      },
      "employeeCount": 6,
      "activeEmployees": 5,
      "inactiveEmployees": 1,
      "averageSalary": "5500.00",
      "attendance": {
        "totalRecords": 80,
        "present": 75,
        "absent": 5,
        "rate": "93.75"
      },
      "leaves": {
        "totalApproved": 12,
        "totalDays": 24
      }
    }
  ]
}
```

### 5. Dashboard Statistics
```
GET /api/reports/dashboard
```

**Access**: Admin, HR, Manager

**Response**:
```json
{
  "success": true,
  "statistics": {
    "employees": {
      "total": 12,
      "active": 10,
      "inactive": 2
    },
    "departments": 4,
    "attendance": {
      "recordsThisMonth": 150,
      "presentThisMonth": 135,
      "rate": "90.00"
    },
    "leaves": {
      "pending": 5,
      "approvedThisMonth": 8
    }
  }
}
```

## Manager Login Credentials

Database mein already ek manager user hai:

**Email**: `manager@ems.com`  
**Password**: `manager123`  
**Employee**: Sophia Patel (EMP104)  
**Designation**: Department Manager  
**Department**: Engineering

## Usage Examples

### Example 1: Engineering Department ki Attendance Report
```bash
GET /api/reports/attendance?department=<engineering_dept_id>&startDate=2026-06-01&endDate=2026-06-30
```

### Example 2: Pending Leave Requests
```bash
GET /api/reports/leaves?status=Pending
```

### Example 3: Department-wise Statistics
```bash
GET /api/reports/departments
```

### Example 4: Specific Employee Report
```bash
GET /api/reports/attendance?employeeId=<employee_id>
```

## Report Features Summary

| Feature | Admin | HR | Manager | Employee |
|---------|-------|-----|---------|----------|
| Employee Reports | ✅ | ✅ | ✅ | ❌ |
| Attendance Reports | ✅ | ✅ | ✅ | ❌ |
| Leave Reports | ✅ | ✅ | ✅ | ❌ |
| Department Statistics | ✅ | ✅ | ✅ | ❌ |
| Dashboard Statistics | ✅ | ✅ | ✅ | ❌ |

## Implementation Details

### Controllers: `reportController.js`
- `getEmployeeReport()` - Employee data with filtering
- `getAttendanceReport()` - Attendance records with analytics
- `getLeaveReport()` - Leave requests with breakdown
- `getDepartmentStatistics()` - Department-wise metrics
- `getDashboardStatistics()` - Overall system stats

### Routes: `reportRoutes.js`
All routes protected with:
```javascript
router.use(protect);
router.use(authorize('admin', 'hr', 'manager'));
```

### Middleware: `authMiddleware.js`
Manager role already configured in User model:
```javascript
role: {
  type: String,
  enum: ['admin', 'hr', 'manager', 'employee'],
  default: 'employee'
}
```

## Benefits

1. **Comprehensive Reporting**: Manager ko complete visibility milti hai apne team ki
2. **Filtering Options**: Department, date range, status ke basis pe filter kar sakte hain
3. **Analytics**: Summary statistics automatically calculate hoti hain
4. **Real-time Data**: Current month ka data by default show hota hai
5. **Role-based Access**: Only authorized roles (Admin, HR, Manager) access kar sakte hain

## Future Enhancements

Aage in features ko add kar sakte hain:
- Export reports to Excel/PDF
- Email scheduled reports
- Custom date range selection
- Performance analytics
- Payroll reports
- Visual charts and graphs
