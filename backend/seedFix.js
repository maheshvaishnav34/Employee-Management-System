require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Department = require('./models/Department');

async function fixSeed() {
  await connectDB();

  let hrDept = await Department.findOne({ name: 'Human Resources' });
  if (!hrDept) {
    hrDept = await Department.create({ name: 'Human Resources', description: 'HR Dept' });
  }

  // Fix HR user
  const hrExists = await User.findOne({ email: 'hr@ems.com' });
  if (!hrExists) {
    let hrEmp = await Employee.findOne({ email: 'hr@ems.com' });
    if (!hrEmp) {
      hrEmp = await Employee.create({ employeeId: 'EMP100', firstName: 'Sarah', lastName: 'HR', email: 'hr@ems.com', phone: '9876543210', gender: 'Female', joiningDate: new Date(), department: hrDept._id, designation: 'HR Manager', salary: 5800 });
    }
    await User.create({ username: 'sarah.hr', email: 'hr@ems.com', password: 'hr1234', role: 'hr', employee: hrEmp._id });
    console.log('✅ Created HR user: hr@ems.com / hr1234');
  } else { console.log('ℹ️  HR user already exists'); }

  // Fix Admin user
  const adminExists = await User.findOne({ email: 'admin@ems.com' });
  if (!adminExists) {
    let adminEmp = await Employee.findOne({ email: 'admin@ems.com' });
    if (!adminEmp) {
      adminEmp = await Employee.create({
        employeeId: 'EMP001',
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@ems.com',
        phone: '1234567890',
        gender: 'Male',
        joiningDate: new Date(),
        department: hrDept._id,
        designation: 'System Administrator',
        salary: 8000
      });
    }
    await User.create({ username: 'admin', email: 'admin@ems.com', password: 'admin123', role: 'admin', employee: adminEmp._id });
    console.log('✅ Created Admin user: admin@ems.com / admin123');
  } else {
    if (!adminExists.employee) {
      let adminEmp = await Employee.findOne({ email: 'admin@ems.com' });
      if (!adminEmp) {
        adminEmp = await Employee.create({
          employeeId: 'EMP001',
          firstName: 'System',
          lastName: 'Admin',
          email: 'admin@ems.com',
          phone: '1234567890',
          gender: 'Male',
          joiningDate: new Date(),
          department: hrDept._id,
          designation: 'System Administrator',
          salary: 8000
        });
      }
      adminExists.employee = adminEmp._id;
      await adminExists.save();
      console.log('✅ Linked existing Admin user to Employee profile');
    }
    console.log('ℹ️  Admin user already exists');
  }

  // Fix Employee user
  const empExists = await User.findOne({ email: 'employee@ems.com' });
  if (!empExists) {
    let devEmp = await Employee.findOne({ email: 'employee@ems.com' });
    if (!devEmp) {
      devEmp = await Employee.create({ employeeId: 'EMP101', firstName: 'Alex', lastName: 'Worker', email: 'employee@ems.com', phone: '9988776655', gender: 'Male', joiningDate: new Date(), department: hrDept._id, designation: 'Software Developer', salary: 4500 });
    }
    await User.create({ username: 'alex.worker', email: 'employee@ems.com', password: 'emp1234', role: 'employee', employee: devEmp._id });
    console.log('✅ Created Employee user: employee@ems.com / emp1234');
  } else { console.log('ℹ️  Employee user already exists'); }

  // Fix Manager user
  const managerExists = await User.findOne({ email: 'manager@ems.com' });
  if (!managerExists) {
    let engDept = await Department.findOne({ name: 'Engineering' });
    if (!engDept) {
      engDept = await Department.create({ name: 'Engineering', description: 'Engineering Dept' });
    }
    let managerEmp = await Employee.findOne({ $or: [{ email: 'manager@ems.com' }, { employeeId: 'EMP104' }] });
    if (!managerEmp) {
      managerEmp = await Employee.create({ employeeId: 'EMP104', firstName: 'Sophia', lastName: 'Patel', email: 'manager@ems.com', phone: '9988776658', gender: 'Female', joiningDate: new Date(), department: engDept._id, designation: 'Department Manager', salary: 5200 });
    } else {
      managerEmp.email = 'manager@ems.com';
      await managerEmp.save();
    }
    // Clean up old user account if any
    await User.deleteMany({ email: 'sophia.patel@ems.com' });

    await User.create({ username: 'sophia.patel', email: 'manager@ems.com', password: 'manager123', role: 'manager', employee: managerEmp._id });
    console.log('✅ Created Manager user: manager@ems.com / manager123');
  } else { console.log('ℹ️  Manager user already exists'); }

  console.log('\nDone! Login credentials:\n  Admin:       admin@ems.com / admin123\n  HR:          hr@ems.com / hr1234\n  Manager:     manager@ems.com / manager123\n  Employee:    employee@ems.com / emp1234');
  process.exit(0);
}

fixSeed().catch(err => { console.error(err); process.exit(1); });
