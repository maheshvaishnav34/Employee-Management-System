require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Models for seeding
const User = require('./models/User');
const Employee = require('./models/Employee');
const Department = require('./models/Department');
const Attendance = require('./models/Attendance');
const LeaveRequest = require('./models/LeaveRequest');
const Payroll = require('./models/Payroll');
const AuditLog = require('./models/AuditLog');
const Candidate = require('./models/Candidate');
const PerformanceReview = require('./models/PerformanceReview');
const Designation = require('./models/Designation');
const Setting = require('./models/Setting');
const Asset = require('./models/Asset');
const AssetRequest = require('./models/AssetRequest');
const Expense = require('./models/Expense');
const Shift = require('./models/Shift');
const CompanyDocument = require('./models/CompanyDocument');
const ChatMessage = require('./models/ChatMessage');
const Mood = require('./models/Mood');
const Poll = require('./models/Poll');
const SkillMatrix = require('./models/SkillMatrix');
const TransferRequest = require('./models/TransferRequest');
const Resignation = require('./models/Resignation');


let isSeeded = false;
async function runSeedsIfNeeded() {
  if (isSeeded) return;
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      console.log('Fresh database detected. Initializing database seeds...');
      await seedDatabase();
      await seedNewCollections();
      await ensureEmployeeProfiles();
    }
    isSeeded = true;
  } catch (err) {
    console.error('Seeding check error:', err.message);
  }
}

// Middleware to ensure DB connection on every request (serverless safe)
app.use(async (req, res, next) => {
  if (process.env.VERCEL && !process.env.MONGODB_URI) {
    return res.status(500).json({
      message: 'Database connection failed: MONGODB_URI environment variable is missing in Vercel.',
      details: 'Please go to Vercel Settings -> Environment Variables and add MONGODB_URI (your MongoDB Atlas URI).'
    });
  }

  try {
    await connectDB();
    await runSeedsIfNeeded();
    next();
  } catch (err) {
    console.error('DB Connection Error:', err);
    res.status(500).json({
      message: 'Database connection failed. Please check your MONGODB_URI in Vercel and ensure MongoDB Atlas Network Access allows 0.0.0.0/0.',
      error: err.message
    });
  }
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // Handle preflight requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
}

// Routes Mount
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api', require('./routes/userRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/recruitment', require('./routes/recruitmentRoutes'));
app.use('/api/performance', require('./routes/performanceRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/rewards', require('./routes/rewardRoutes'));
app.use('/api/designations', require('./routes/designationRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/engagement', require('./routes/engagementRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/skills', require('./routes/skillMatrixRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/resignations', require('./routes/resignationRoutes'));
app.use('/api/manager/approvals', require('./routes/managerApprovalRoutes'));
app.use('/api/insights', require('./routes/performanceInsightRoutes'));


// Root path handler
app.get('/', (req, res) => {
  res.send('Employee Management System API is running...');
});

// Error Handler Middleware
app.use(errorHandler);

// Database Seeding Routine — only seeds if DB is empty
async function seedDatabase() {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log(`Database already has ${existingUsers} users — skipping seed.`);
      return;
    }
    console.log('Empty database detected — seeding fresh data...');
    await Employee.deleteMany({});
    await Department.deleteMany({});
    await Attendance.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Payroll.deleteMany({});
    await AuditLog.deleteMany({});
    await User.deleteMany({});
    await Designation.deleteMany({});
    await Setting.deleteMany({});

    console.log('Seeding designations...');
    const defaultDesignations = [
      { name: 'HR Manager', description: 'Manages HR operations' },
      { name: 'Department Manager', description: 'Manages department employees and operations' },
      { name: 'Tech Lead', description: 'Leads software engineering teams' },
      { name: 'Senior Developer', description: 'Senior software engineering' },
      { name: 'QA Engineer', description: 'Quality assurance and testing' },
      { name: 'Marketing Lead', description: 'Leads marketing operations' },
      { name: 'Marketing Executive', description: 'Executes marketing plans' },
      { name: 'Sales Lead', description: 'Leads sales team' },
      { name: 'Sales Agent', description: 'Sales representative' },
      { name: 'Software Intern', description: 'Junior developer trainee' },
      { name: 'HR Associate', description: 'Supports HR operations' },
      { name: 'UI/UX Designer', description: 'User interface and experience designer' },
      { name: 'Junior Developer', description: 'Junior software developer' }
    ];
    await Designation.insertMany(defaultDesignations);

    console.log('Seeding system settings...');
    await Setting.create({
      companyName: 'EMS Hub Technologies',
      contactEmail: 'support@emshub.io',
      businessHours: '09:00 AM - 06:00 PM',
      holidayPolicy: 'Standard 12 Paid Holidays',
      enableBackups: true,
      authLevel: 'JWT + Role Rules',
      salaryRuleMin: 1000,
      emailNotifications: true
    });


    console.log('Seeding departments...');
    const engDept = await Department.create({ name: 'Engineering', description: 'Software engineering, development, and QA.' });
    const hrDept = await Department.create({ name: 'Human Resources', description: 'Personnel management, talent culture, and operations.' });
    const mktDept = await Department.create({ name: 'Marketing', description: 'Branding, marketing, campaigns, and digital advertising.' });
    const salesDept = await Department.create({ name: 'Sales', description: 'Business development and client accounts.' });

    console.log('Seeding admin users...');
    const adminEmp = await Employee.create({
      employeeId: 'EMP001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@ems.com',
      phone: '1234567890',
      gender: 'Male',
      designation: 'System Administrator',
      salary: 8000,
      department: hrDept._id,
      joiningDate: new Date(),
      dateOfBirth: new Date('1985-01-01'),
      status: 'Active',
    });

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@ems.com',
      password: 'admin123',
      role: 'admin',
      employee: adminEmp._id,
    });
    console.log('Seeded Default Admin: admin@ems.com');

    console.log('Seeding employees...');
    const employeesData = [
      { employeeId: 'EMP100', firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah.jenkins@ems.com', phone: '9876543210', gender: 'Female', designation: 'HR Manager', salary: 6000, department: hrDept._id, role: 'hr', dob: '1990-04-12' },
      { employeeId: 'EMP101', firstName: 'John', lastName: 'Doe', email: 'john.doe@ems.com', phone: '9988776655', gender: 'Male', designation: 'Tech Lead', salary: 7500, department: engDept._id, role: 'employee', dob: '1988-08-25' },
      { employeeId: 'EMP102', firstName: 'Alex', lastName: 'Rivera', email: 'alex.rivera@ems.com', phone: '9988776656', gender: 'Male', designation: 'Senior Developer', salary: 5800, department: engDept._id, role: 'employee', dob: '1992-11-03' },
      { employeeId: 'EMP103', firstName: 'Emma', lastName: 'Watson', email: 'emma.watson@ems.com', phone: '9988776657', gender: 'Female', designation: 'QA Engineer', salary: 4600, department: engDept._id, role: 'employee', dob: '1994-06-18' },
      { employeeId: 'EMP104', firstName: 'Sophia', lastName: 'Patel', email: 'sophia.patel@ems.com', phone: '9988776658', gender: 'Female', designation: 'Department Manager', salary: 5200, department: engDept._id, role: 'manager', dob: '1993-01-20' },
      { employeeId: 'EMP105', firstName: 'David', lastName: 'Miller', email: 'david.miller@ems.com', phone: '9988776659', gender: 'Male', designation: 'Marketing Executive', salary: 4200, department: mktDept._id, role: 'employee', dob: '1995-10-09' },
      { employeeId: 'EMP106', firstName: 'Michael', lastName: 'Chang', email: 'michael.chang@ems.com', phone: '9988776660', gender: 'Male', designation: 'Sales Lead', salary: 5500, department: salesDept._id, role: 'employee', dob: '1989-05-15' },
      { employeeId: 'EMP107', firstName: 'Jessica', lastName: 'Taylor', email: 'jessica.taylor@ems.com', phone: '9988776661', gender: 'Female', designation: 'Sales Agent', salary: 4000, department: salesDept._id, role: 'employee', dob: '1996-03-30' },
      { employeeId: 'EMP108', firstName: 'Ryan', lastName: 'Kapoor', email: 'ryan.kapoor@ems.com', phone: '9988776662', gender: 'Male', designation: 'Software Intern', salary: 2500, department: engDept._id, role: 'employee', dob: '1999-12-05' },
      { employeeId: 'EMP109', firstName: 'Lisa', lastName: 'Adams', email: 'lisa.adams@ems.com', phone: '9988776663', gender: 'Female', designation: 'HR Associate', salary: 4400, department: hrDept._id, role: 'employee', dob: '1997-07-22' },
      { employeeId: 'EMP110', firstName: 'Kevin', lastName: 'Owens', email: 'kevin.owens@ems.com', phone: '9988776664', gender: 'Male', designation: 'UI/UX Designer', salary: 4800, department: mktDept._id, role: 'employee', dob: '1991-09-14', status: 'Inactive' },
      { employeeId: 'EMP111', firstName: 'Chloe', lastName: 'Bennett', email: 'chloe.bennett@ems.com', phone: '9988776665', gender: 'Female', designation: 'Junior Developer', salary: 4000, department: engDept._id, role: 'employee', dob: '1998-02-28', status: 'Inactive' },
    ];

    const seededEmployees = [];
    const seededUsers = [];

    for (const emp of employeesData) {
      const joiningDate = new Date();
      if (emp.employeeId === 'EMP100') joiningDate.setMonth(joiningDate.getMonth() - 5);
      else if (emp.employeeId === 'EMP101') joiningDate.setMonth(joiningDate.getMonth() - 4);
      else if (emp.employeeId === 'EMP102') joiningDate.setMonth(joiningDate.getMonth() - 3);
      else if (emp.employeeId === 'EMP103') joiningDate.setMonth(joiningDate.getMonth() - 2);
      else if (emp.employeeId === 'EMP104') joiningDate.setMonth(joiningDate.getMonth() - 1);

      const employee = await Employee.create({
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        gender: emp.gender,
        designation: emp.designation,
        salary: emp.salary,
        department: emp.department,
        joiningDate: joiningDate,
        dateOfBirth: new Date(emp.dob),
        status: emp.status || 'Active',
      });
      seededEmployees.push(employee);

      let password = 'password123';
      if (emp.role === 'hr') password = 'hr1234';
      else if (emp.role === 'manager') password = 'manager123';
      else if (emp.employeeId === 'EMP101') password = 'emp1234';

      const emailForUser = emp.employeeId === 'EMP100' ? 'hr@ems.com' : (emp.employeeId === 'EMP101' ? 'employee@ems.com' : (emp.role === 'manager' ? 'manager@ems.com' : emp.email));

      const user = await User.create({
        username: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}`,
        email: emailForUser,
        password: password,
        role: emp.role,
        employee: employee._id,
      });
      seededUsers.push(user);
    }
    console.log(`Seeded ${seededEmployees.length} employees and users.`);

    // 5. Generate Attendance Logs for past 15 days
    console.log('Seeding attendance...');
    const activeEmps = seededEmployees.filter(e => e.status === 'Active');
    const today = new Date();
    
    for (let d = 15; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      date.setHours(0, 0, 0, 0);

      // Skip Sundays
      if (date.getDay() === 0) continue;

      for (const emp of activeEmps) {
        const roll = Math.random();
        if (roll > 0.88) continue; // absent day

        let clockInHour = 9;
        let clockInMinute = Math.floor(Math.random() * 20); // 9:00 - 9:20
        let status = 'Present';

        if (roll > 0.72) {
          // Late arrival
          clockInHour = 9;
          clockInMinute = 31 + Math.floor(Math.random() * 40);
          status = 'Late';
        }

        const clockIn = new Date(date);
        clockIn.setHours(clockInHour, clockInMinute, 0, 0);

        const clockOut = new Date(date);
        clockOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

        const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

        await Attendance.create({
          employee: emp._id,
          date: date,
          clockIn: clockIn,
          clockOut: clockOut,
          status: status,
          totalHours: Math.round(totalHours * 10) / 10,
        });
      }
    }

    // 6. Generate Payroll entries for May and June
    console.log('Seeding payroll...');
    const months = ['2026-05', '2026-06'];
    for (const m of months) {
      for (const emp of seededEmployees) {
        const bonuses = m === '2026-06' ? 250 : 0;
        const deductions = 120;
        const netSalary = emp.salary + bonuses - deductions;

        await Payroll.create({
          employee: emp._id,
          month: m,
          baseSalary: emp.salary,
          bonuses: bonuses,
          deductions: deductions,
          netSalary: netSalary,
          status: 'Paid',
          paymentDate: new Date(m === '2026-05' ? '2026-05-28' : '2026-06-28'),
        });
      }
    }

    // 7. Generate Leave Requests
    console.log('Seeding leave requests...');
    const hrUser = seededUsers.find(u => u.role === 'hr');
    const sarahEmp = seededEmployees.find(e => e.firstName === 'Sarah');
    const johnEmp = seededEmployees.find(e => e.firstName === 'John');
    const emmaEmp = seededEmployees.find(e => e.firstName === 'Emma');
    const alexEmp = seededEmployees.find(e => e.firstName === 'Alex');

    // Approved leave
    const leaveApproved = await LeaveRequest.create({
      employee: johnEmp._id,
      leaveType: 'Casual',
      startDate: new Date(new Date().setDate(today.getDate() - 10)),
      endDate: new Date(new Date().setDate(today.getDate() - 8)),
      reason: 'Family wedding attendance.',
      status: 'Approved',
      approvedBy: hrUser._id,
      appliedDate: new Date(new Date().setDate(today.getDate() - 15)),
    });

    // Rejected leave
    const leaveRejected = await LeaveRequest.create({
      employee: alexEmp._id,
      leaveType: 'Sick',
      startDate: new Date(new Date().setDate(today.getDate() - 2)),
      endDate: new Date(new Date().setDate(today.getDate() - 1)),
      reason: 'Urgent medical checkup.',
      status: 'Rejected',
      approvedBy: hrUser._id,
      appliedDate: new Date(new Date().setDate(today.getDate() - 4)),
    });

    // Pending leaves
    await LeaveRequest.create({
      employee: emmaEmp._id,
      leaveType: 'Casual',
      startDate: new Date(new Date().setDate(today.getDate() + 3)),
      endDate: new Date(new Date().setDate(today.getDate() + 5)),
      reason: 'Personal work at hometown.',
      status: 'Pending',
      appliedDate: new Date(new Date().setDate(today.getDate() - 1)),
    });

    await LeaveRequest.create({
      employee: sarahEmp._id,
      leaveType: 'Sick',
      startDate: new Date(new Date().setDate(today.getDate() + 1)),
      endDate: new Date(new Date().setDate(today.getDate() + 2)),
      reason: 'Dental surgery procedure.',
      status: 'Pending',
      appliedDate: new Date(),
    });
    // 7.5 Seeding Recruitment Candidates and Performance Reviews
    console.log('Seeding recruitment candidates...');
    await Candidate.deleteMany({});
    await Candidate.create([
      { name: 'John Smith', email: 'john.smith@gmail.com', phone: '1234567890', designation: 'Node.js Developer', status: 'Interview Scheduled', interviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), notes: 'Good backend concepts.' },
      { name: 'Alice Brown', email: 'alice.b@yahoo.com', phone: '9876543210', designation: 'React Developer', status: 'Applied', notes: 'Strong portfolio in TailwindCSS.' },
      { name: 'Bob Johnson', email: 'bob.j@gmail.com', phone: '5551234567', designation: 'HR Executive', status: 'Hired', notes: 'Excellent communication.' }
    ]);

    console.log('Seeding performance reviews...');
    await PerformanceReview.deleteMany({});
    if (johnEmp && sarahEmp) {
      await PerformanceReview.create({
        employee: johnEmp._id,
        reviewer: sarahEmp._id,
        rating: 5,
        feedback: 'Excellent developer, meets all project milestones ahead of schedule. Very supportive team member.',
        reviewPeriod: 'Q1 2026'
      });
    }
    // 8. Generate Audit Logs
    console.log('Seeding audit logs...');
    const auditLogs = [
      { action: 'CREATE_EMPLOYEE', entity: 'Employee', entityId: johnEmp._id, details: 'Created employee profile for John Doe (EMP101).' },
      { action: 'CREATE_DEPARTMENT', entity: 'Department', entityId: engDept._id, details: 'Created department Engineering.' },
      { action: 'GENERATE_PAYROLL', entity: 'Payroll', details: 'Processed monthly salary payroll for May 2026.' },
      { action: 'APPROVE_LEAVE', entity: 'Leave', entityId: leaveApproved._id, details: 'Approved Casual leave request for John Doe.' },
      { action: 'REJECT_LEAVE', entity: 'Leave', entityId: leaveRejected._id, details: 'Rejected Sick leave request for Alex Rivera.' },
    ];

    for (const log of auditLogs) {
      await AuditLog.create({
        action: log.action,
        entity: log.entity,
        entityId: log.entityId || null,
        performedBy: adminUser._id,
        details: log.details,
      });
    }

    console.log('Database seeding finished successfully!');
  } catch (err) {
    console.error('Error during database seeding:', err.message);
  }
}

async function seedNewCollections() {
  try {
    const employees = await Employee.find({});
    const users = await User.find({});
    const adminUser = users.find(u => u.role === 'admin') || users[0];

    if (employees.length === 0 || users.length === 0) {
      console.log('No employees/users found to bind seed data - skipping.');
      return;
    }

    const johnDoe = employees.find(e => e.firstName === 'John') || employees[0];
    const sarahJenkins = employees.find(e => e.firstName === 'Sarah') || employees[0];

    const assetsCount = await Asset.countDocuments();
    if (assetsCount === 0) {
      console.log('Seeding new premium features (Assets, Shifts, Documents, Chat)...');
      
      // 1. Assets
      await Asset.create({
        name: 'MacBook Pro 14"',
        serialNumber: 'MBP14-2026-X89',
        category: 'Laptop',
        status: 'Assigned',
        assignedTo: johnDoe._id,
        assignedDate: new Date(),
        value: 1999,
        condition: 'New',
      });

      await Asset.create({
        name: 'Dell UltraSharp 27"',
        serialNumber: 'DELL-27U-892',
        category: 'Monitor',
        status: 'Assigned',
        assignedTo: johnDoe._id,
        assignedDate: new Date(),
        value: 399,
        condition: 'Good',
      });

      await Asset.create({
        name: 'ThinkPad T14 Gen 4',
        serialNumber: 'TP-T14-5561',
        category: 'Laptop',
        status: 'Available',
        value: 1299,
        condition: 'Good',
      });

      // Asset Requests
      await AssetRequest.create({
        employee: sarahJenkins._id,
        assetCategory: 'Phone',
        reason: 'Need test device for recruitment interviews & notifications.',
        urgency: 'Medium',
        status: 'Pending',
      });

      // 2. Expenses
      await Expense.create({
        employee: johnDoe._id,
        title: 'AWS Subscriptions - May 2026',
        amount: 450.50,
        category: 'Software/Subscriptions',
        description: 'Monthly production database server billing.',
        date: new Date(),
        status: 'Pending',
      });

      await Expense.create({
        employee: sarahJenkins._id,
        title: 'Recruitment Lunch with Candidate',
        amount: 85.00,
        category: 'Meals',
        description: 'Interview lunch for UI Designer role.',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'Approved',
        approvedBy: adminUser._id,
        approvedDate: new Date(),
        notes: 'Approved. Standard hiring expense.',
      });

      // 3. Shifts
      const today = new Date();
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        // Skip Sundays
        if (date.getDay() === 0) continue;

        await Shift.create({
          employee: johnDoe._id,
          date: date,
          startTime: '09:00',
          endTime: '17:00',
          type: 'Morning',
          notes: 'Regular dev task hours.',
          scheduledBy: adminUser._id,
        });

        await Shift.create({
          employee: sarahJenkins._id,
          date: date,
          startTime: '10:00',
          endTime: '18:00',
          type: 'Evening',
          notes: 'Recruitment coordination hours.',
          scheduledBy: adminUser._id,
        });
      }

      // 4. Documents
      await CompanyDocument.create({
        title: 'EMS Hub Employee Handbook 2026',
        description: 'General guidelines, code of conduct, and organizational structure overview.',
        category: 'Handbook',
        content: `## Welcome to EMS Hub Technologies!
This handbook outlines our core values, expectations, and policies. Please review them carefully.

### 1. Code of Conduct
We maintain a safe, inclusive, and professional workspace for all employees. 

### 2. Working Hours
Our standard business hours are 09:00 AM - 06:00 PM. Shifts may vary based on role and manager directives.

### 3. Reporting Leaves
All leave requests should be submitted at least 48 hours in advance via the Leaves portal.`,
        isGlobal: true,
        uploadedBy: adminUser._id,
      });

      await CompanyDocument.create({
        title: 'Remote Work & Hybrid Policies',
        description: 'Detailed instructions on eligibility, safety, and equipment requests for hybrid staff.',
        category: 'Policy',
        content: `## Hybrid Work Program
We support flexibility. The remote work policy outlines standard expectations.

### 1. Hybrid Eligibility
Staff in eligible engineering roles may work up to 3 days remote per week, coordinated with Tech Lead.

### 2. Device Security
Laptops assigned by the company must remain secure. Always use the company VPN when connecting to production.`,
        isGlobal: true,
        uploadedBy: adminUser._id,
      });

      // 5. Chat Messages (Global and Direct messages)
      const userJohn = users.find(u => u.username.startsWith('john')) || users[0];
      const userSarah = users.find(u => u.username.startsWith('sarah')) || users[1] || users[0];
      
      // Global Channel
      await ChatMessage.create({
        sender: adminUser._id,
        message: 'Welcome everyone to the EMS Hub global channel! Feel free to share updates here.',
        isGlobalChannel: true,
      });

      await ChatMessage.create({
        sender: userSarah._id,
        message: 'Thanks Admin! Happy to collaborate with everyone here.',
        isGlobalChannel: true,
      });

      // Direct Messages
      await ChatMessage.create({
        sender: userSarah._id,
        recipient: userJohn._id,
        message: 'Hi John, did you receive the AWS billing receipt for this month?',
        isGlobalChannel: false,
      });

      await ChatMessage.create({
        sender: userJohn._id,
        recipient: userSarah._id,
        message: 'Hey Sarah, yes! Just submitted the expense claim for approval. Let me know if you need anything else.',
        isGlobalChannel: false,
      });
      console.log('Seeded initial assets, shifts, documents, and chats.');
    } else {
      console.log('New collections (Assets, etc.) already seeded - skipping assets seed.');
    }

    const pollCount = await Poll.countDocuments();
    if (pollCount === 0) {
      // 6. Mood and Polls Seeding
      console.log('Seeding employee moods and engagement polls...');
      await Mood.deleteMany({});
      await Poll.deleteMany({});

      // Create some past moods for last 15 days for John and Sarah to populate analytics
      const today = new Date();
      const moodOptions = ['excellent', 'good', 'neutral', 'tired', 'stressed'];
      const comments = {
        excellent: ['Feeling highly productive today!', 'Great team sync, moving fast.'],
        good: ['Good progress on the tickets.', 'Nice day, resolved a tricky bug.'],
        neutral: ['Standard work day, nothing special.', 'Documentation work today.'],
        tired: ['Long coding hours. Feeling a bit drained.', 'Need a coffee break!'],
        stressed: ['Tight deadlines approaching.', 'High amount of customer tickets today.'],
      };

      for (let dayOffset = 15; dayOffset >= 1; dayOffset--) {
        const moodDate = new Date();
        moodDate.setDate(today.getDate() - dayOffset);
        const mYear = moodDate.getFullYear();
        const mMonth = String(moodDate.getMonth() + 1).padStart(2, '0');
        const mDay = String(moodDate.getDate()).padStart(2, '0');
        const moodDateString = `${mYear}-${mMonth}-${mDay}`;

        // John Doe's past moods
        const johnMood = moodOptions[Math.floor(Math.random() * moodOptions.length)];
        const johnCommentList = comments[johnMood];
        const johnComment = Math.random() > 0.4 ? johnCommentList[Math.floor(Math.random() * johnCommentList.length)] : '';
        await Mood.create({
          employee: johnDoe._id,
          dateString: moodDateString,
          mood: johnMood,
          notes: johnComment,
          createdAt: moodDate,
        });

        // Sarah Jenkins' past moods
        const sarahMood = moodOptions[Math.floor(Math.random() * moodOptions.length)];
        const sarahCommentList = comments[sarahMood];
        const sarahComment = Math.random() > 0.4 ? sarahCommentList[Math.floor(Math.random() * sarahCommentList.length)] : '';
        await Mood.create({
          employee: sarahJenkins._id,
          dateString: moodDateString,
          mood: sarahMood,
          notes: sarahComment,
          createdAt: moodDate,
        });
      }

      // Create a seed active poll
      const seedPoll = await Poll.create({
        question: 'Should we introduce a 4-day hybrid work week model (10-hour days)?',
        options: ['Yes, fully support it', 'No, prefer 5 days (8 hours)', 'Undecided / Need more details'],
        createdBy: adminUser._id,
        isActive: true,
      });

      // Add some votes to it
      const otherEmployees = employees.filter(e => e.firstName !== 'John' && e.firstName !== 'Sarah');
      otherEmployees.forEach((emp, index) => {
        const optIndex = index % 3;
        seedPoll.votes.push({
          employee: emp._id,
          optionIndex: optIndex,
          votedAt: new Date(),
        });
      });
      await seedPoll.save();
      console.log('Seeded employee moods and active poll.');
    } else {
      console.log('Engagement moods and polls already seeded - skipping engagement seed.');
    }

    console.log('Seeding operations completed successfully!');
  } catch (err) {
    console.error('Error seeding new collections:', err.message);
  }
}

async function ensureEmployeeProfiles() {
  try {
    // Sync emails for existing accounts to fix mismatches
    const allUsers = await User.find({ employee: { $ne: null } }).populate('employee');
    for (const u of allUsers) {
      if (u.employee && u.employee.email !== u.email) {
        await Employee.updateOne({ _id: u.employee._id }, { email: u.email });
        console.log(`Synced Employee ${u.employee.employeeId} email to match User email: ${u.email}`);
      }
    }

    const users = await User.find({ employee: null });
    if (users.length === 0) return;
    
    console.log(`Found ${users.length} users without employee profiles. Creating profiles...`);
    
    // Get or create a default department
    let dept = await Department.findOne({ name: 'Engineering' });
    if (!dept) {
      dept = await Department.findOne({});
    }
    if (!dept) {
      dept = await Department.create({ name: 'Administration', description: 'Administrative operations' });
    }
    
    for (const user of users) {
      const email = user.email.toLowerCase();
      // Check if employee with this email already exists but is not linked
      let employee = await Employee.findOne({ email });
      
      if (!employee) {
        // Create new employee
        const usernameParts = user.username ? user.username.split('.') : [email.split('@')[0], ''];
        const firstName = usernameParts[0] ? (usernameParts[0].charAt(0).toUpperCase() + usernameParts[0].slice(1)) : 'User';
        const lastName = usernameParts[1] ? (usernameParts[1].charAt(0).toUpperCase() + usernameParts[1].slice(1)) : 'Profile';
        
        const empId = `EMP${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
        
        employee = await Employee.create({
          employeeId: empId,
          firstName,
          lastName,
          email,
          phone: '1234567890',
          gender: 'Other',
          designation: user.role === 'admin' ? 'System Administrator' : (user.role === 'hr' ? 'HR Specialist' : 'Staff'),
          salary: user.role === 'admin' ? 8000 : 5000,
          department: dept._id,
          joiningDate: new Date(),
          dateOfBirth: new Date('1990-01-01'),
          status: 'Active'
        });
        console.log(`Created new employee profile ${empId} for ${email}`);
      }
      
      await User.updateOne({ _id: user._id }, { employee: employee._id });
      console.log(`Linked user ${user.username || email} to employee profile ${employee.employeeId}`);
    }
  } catch (err) {
    console.error('Error in ensureEmployeeProfiles:', err.message);
  }
}

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDB().then(async () => {
    await seedDatabase();
    await seedNewCollections();
    await ensureEmployeeProfiles();
  });

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
