import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import logger from '../config/logger.js';
import { ROLES, TASK_STATUS } from '@workboard/shared';

const seedData = async () => {
  try {
    logger.info('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    
    logger.info('🗑️ Cleared existing data');

    // Create users
    const adminUser = new User({
      email: 'admin@workboard.dev',
      name: 'Admin User',
      role: ROLES.ADMIN,
      passwordHash: await User.hashPassword('Admin@123'),
      leaveBalance: 20
    });

    const managerUser = new User({
      email: 'manager@workboard.dev',
      name: 'Project Manager',
      role: ROLES.MANAGER,
      passwordHash: await User.hashPassword('Manager@123'),
      leaveBalance: 15
    });

    const employeeUser = new User({
      email: 'employee@workboard.dev',
      name: 'Team Member',
      role: ROLES.EMPLOYEE,
      passwordHash: await User.hashPassword('Employee@123'),
      leaveBalance: 12
    });

    await Promise.all([
      adminUser.save(),
      managerUser.save(),
      employeeUser.save()
    ]);

    logger.info('👥 Created users:', {
      admin: adminUser.email,
      manager: managerUser.email,
      employee: employeeUser.email
    });

    // Create demo project
    const demoProject = new Project({
      name: 'Workboard Demo Project',
      key: 'DEMO',
      description: 'A sample project to demonstrate Workboard features and capabilities',
      manager: managerUser._id,
      members: [managerUser._id, employeeUser._id]
    });

    await demoProject.save();
    logger.info('📋 Created demo project:', { key: demoProject.key, name: demoProject.name });

    // Create sample tasks
    const sampleTasks = [
      {
        project: demoProject._id,
        title: 'Set up project repository',
        description: 'Initialize Git repository and set up basic project structure',
        assignees: [employeeUser._id],
        status: TASK_STATUS.DONE,
        points: 3
      },
      {
        project: demoProject._id,
        title: 'Design user interface mockups',
        description: 'Create wireframes and mockups for the main application screens',
        assignees: [employeeUser._id],
        status: TASK_STATUS.IN_PROGRESS,
        points: 5,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
      },
      {
        project: demoProject._id,
        title: 'Implement user authentication',
        description: 'Build login, registration, and session management features',
        assignees: [employeeUser._id],
        status: TASK_STATUS.TODO,
        points: 8,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks from now
      },
      {
        project: demoProject._id,
        title: 'Write API documentation',
        description: 'Document all REST API endpoints with examples and schemas',
        assignees: [managerUser._id],
        status: TASK_STATUS.BACKLOG,
        points: 3
      },
      {
        project: demoProject._id,
        title: 'Set up automated testing',
        description: 'Configure unit tests, integration tests, and CI/CD pipeline',
        assignees: [employeeUser._id],
        status: TASK_STATUS.REVIEW,
        points: 5
      },
      {
        project: demoProject._id,
        title: 'Deploy to production',
        description: 'Set up production environment and deploy the application',
        assignees: [managerUser._id, employeeUser._id],
        status: TASK_STATUS.BACKLOG,
        points: 8
      }
    ];

    await Task.insertMany(sampleTasks);
    logger.info('📝 Created sample tasks:', { count: sampleTasks.length });

    logger.info('✅ Database seeding completed successfully!');
    logger.info('\n📋 Demo Accounts:');
    logger.info('   Admin:    admin@workboard.dev / Admin@123');
    logger.info('   Manager:  manager@workboard.dev / Manager@123');
    logger.info('   Employee: employee@workboard.dev / Employee@123');
    logger.info('\n🚀 You can now start the development server and login with any of these accounts.');

  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Connect to database and run seeding
const runSeeding = async () => {
  try {
    await connectDB();
    await seedData();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeding();
}

export default seedData;