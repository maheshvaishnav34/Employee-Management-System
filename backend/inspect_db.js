const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/employee_management');
    console.log('Connected to MongoDB.');
    const users = await User.find({ employee: null });
    console.log('--- USERS WITHOUT EMPLOYEE ---');
    for (const u of users) {
      console.log({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        employee: u.employee,
        usernameType: typeof u.username,
        usernameIsNull: u.username === null,
        emailIsNull: u.email === null
      });
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
