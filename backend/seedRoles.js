const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Designation = require('./models/Designation');

dotenv.config();

const professionalRoles = [
  // Executive Leadership
  { name: 'Chief Executive Officer', description: 'Top executive responsible for overall company operations', level: 10, category: 'Executive' },
  { name: 'Chief Technology Officer', description: 'Executive overseeing technology strategy and implementation', level: 10, category: 'Executive' },
  { name: 'Chief Financial Officer', description: 'Executive managing financial operations and strategy', level: 10, category: 'Executive' },
  { name: 'Chief Operating Officer', description: 'Executive overseeing daily business operations', level: 10, category: 'Executive' },
  
  // Senior Management
  { name: 'Vice President', description: 'Senior leader managing major business units', level: 9, category: 'Senior Management' },
  { name: 'Director', description: 'Senior manager overseeing multiple teams or departments', level: 8, category: 'Senior Management' },
  { name: 'Senior Manager', description: 'Experienced manager leading teams and projects', level: 7, category: 'Management' },
  
  // Management
  { name: 'Manager', description: 'Team leader responsible for operations and staff', level: 6, category: 'Management' },
  { name: 'Assistant Manager', description: 'Supports manager in team leadership and operations', level: 5, category: 'Management' },
  { name: 'Team Lead', description: 'Leads small team and coordinates daily activities', level: 4, category: 'Management' },
  
  // Engineering & Development
  { name: 'Principal Engineer', description: 'Senior technical expert leading complex projects', level: 8, category: 'Engineering' },
  { name: 'Senior Software Engineer', description: 'Experienced developer with advanced technical skills', level: 6, category: 'Engineering' },
  { name: 'Software Engineer', description: 'Professional developer building software solutions', level: 5, category: 'Engineering' },
  { name: 'Junior Software Engineer', description: 'Entry-level developer learning and contributing', level: 3, category: 'Engineering' },
  { name: 'DevOps Engineer', description: 'Manages infrastructure and deployment pipelines', level: 5, category: 'Engineering' },
  { name: 'QA Engineer', description: 'Ensures software quality through testing', level: 5, category: 'Engineering' },
  
  // Design & UX
  { name: 'Lead Designer', description: 'Senior designer leading design team and projects', level: 7, category: 'Design' },
  { name: 'Senior UI/UX Designer', description: 'Experienced designer creating user interfaces', level: 6, category: 'Design' },
  { name: 'UI/UX Designer', description: 'Designer creating user experiences and interfaces', level: 5, category: 'Design' },
  { name: 'Graphic Designer', description: 'Creates visual content and branding materials', level: 4, category: 'Design' },
  
  // Product & Business
  { name: 'Product Manager', description: 'Manages product strategy and development', level: 6, category: 'Product' },
  { name: 'Business Analyst', description: 'Analyzes business requirements and solutions', level: 5, category: 'Business' },
  { name: 'Project Manager', description: 'Plans and executes projects to completion', level: 6, category: 'Management' },
  
  // Marketing & Sales
  { name: 'Marketing Manager', description: 'Leads marketing strategy and campaigns', level: 6, category: 'Marketing' },
  { name: 'Marketing Specialist', description: 'Executes marketing initiatives and campaigns', level: 4, category: 'Marketing' },
  { name: 'Sales Manager', description: 'Manages sales team and revenue targets', level: 6, category: 'Sales' },
  { name: 'Sales Executive', description: 'Drives sales and customer acquisition', level: 4, category: 'Sales' },
  
  // HR & Operations
  { name: 'HR Manager', description: 'Manages human resources and employee relations', level: 6, category: 'HR' },
  { name: 'HR Specialist', description: 'Handles recruitment, training, and HR operations', level: 4, category: 'HR' },
  { name: 'Operations Manager', description: 'Oversees operational processes and efficiency', level: 6, category: 'Operations' },
  { name: 'Administrative Assistant', description: 'Provides administrative and clerical support', level: 3, category: 'Administration' },
  
  // Finance & Accounting
  { name: 'Finance Manager', description: 'Manages financial planning and reporting', level: 6, category: 'Finance' },
  { name: 'Accountant', description: 'Handles accounting and financial records', level: 4, category: 'Finance' },
  
  // Customer Support
  { name: 'Customer Support Manager', description: 'Leads customer support operations', level: 6, category: 'Support' },
  { name: 'Customer Support Specialist', description: 'Provides customer service and support', level: 3, category: 'Support' },
  
  // Internships & Entry Level
  { name: 'Intern', description: 'Learning and gaining work experience', level: 1, category: 'Entry Level' },
  { name: 'Trainee', description: 'Receiving training for future role', level: 2, category: 'Entry Level' },
];

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    await Designation.deleteMany();
    console.log('Existing designations cleared');

    const roles = await Designation.insertMany(professionalRoles);
    console.log(`${roles.length} professional roles added successfully!`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
};

seedRoles();
