import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Ticket from '../models/Ticket.js';
import LeaveRequest from '../models/LeaveRequest.js';
import logger from '../config/logger.js';
import { ROLES, TASK_STATUS, TICKET_TYPES, TICKET_PRIORITY, TICKET_STATUS, LEAVE_STATUS } from '@workboard/shared';

const seedData = async () => {
  try {
    logger.info('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Ticket.deleteMany({});
    await LeaveRequest.deleteMany({});
    
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

    const employee2User = new User({
      email: 'employee2@workboard.dev',
      name: 'Senior Developer',
      role: ROLES.EMPLOYEE,
      passwordHash: await User.hashPassword('Employee@123'),
      leaveBalance: 18
    });

    await Promise.all([
      adminUser.save(),
      managerUser.save(),
      employeeUser.save(),
      employee2User.save()
    ]);

    logger.info('👥 Created users:', {
      admin: adminUser.email,
      manager: managerUser.email,
      employee1: employeeUser.email,
      employee2: employee2User.email
    });

    // Create demo projects
    const demoProject = new Project({
      name: 'Workboard Demo Project',
      key: 'DEMO',
      description: 'A sample project to demonstrate Workboard features and capabilities',
      manager: managerUser._id,
      members: [managerUser._id, employeeUser._id, employee2User._id]
    });

    const mobileProject = new Project({
      name: 'Mobile App Development',
      key: 'MOBILE',
      description: 'Cross-platform mobile application development project',
      manager: managerUser._id,
      members: [managerUser._id, employee2User._id]
    });

    await Promise.all([demoProject.save(), mobileProject.save()]);
    logger.info('📋 Created demo projects:', { 
      demo: demoProject.key, 
      mobile: mobileProject.key 
    });

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
        assignees: [employee2User._id],
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
        assignees: [employee2User._id],
        status: TASK_STATUS.REVIEW,
        points: 5
      },
      {
        project: mobileProject._id,
        title: 'Research React Native vs Flutter',
        description: 'Compare cross-platform frameworks and make technology decision',
        assignees: [employee2User._id],
        status: TASK_STATUS.DONE,
        points: 5
      },
      {
        project: mobileProject._id,
        title: 'Design app navigation flow',
        description: 'Create user flow diagrams and navigation structure',
        assignees: [employee2User._id],
        status: TASK_STATUS.IN_PROGRESS,
        points: 3,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      }
    ];

    await Task.insertMany(sampleTasks);
    logger.info('📝 Created sample tasks:', { count: sampleTasks.length });

    // Create sample tickets
    const sampleTickets = [
      {
        project: demoProject._id,
        raisedBy: employeeUser._id,
        title: 'Login button not working on mobile',
        description: 'When testing on mobile devices, the login button appears to be unresponsive. Users cannot tap it to submit the form.',
        type: TICKET_TYPES.BUG,
        priority: TICKET_PRIORITY.HIGH,
        status: TICKET_STATUS.OPEN,
        watchers: [employeeUser._id, managerUser._id],
        comments: [
          {
            author: managerUser._id,
            body: 'Thanks for reporting this. Can you specify which mobile devices you tested on?',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          },
          {
            author: employeeUser._id,
            body: 'Tested on iPhone 12 (Safari) and Samsung Galaxy S21 (Chrome). Issue occurs on both.',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
          }
        ]
      },
      {
        project: demoProject._id,
        raisedBy: employee2User._id,
        assignedTo: managerUser._id,
        title: 'Add dark mode support',
        description: 'Users have requested a dark mode option for better accessibility and user experience during nighttime usage.',
        type: TICKET_TYPES.REQUEST,
        priority: TICKET_PRIORITY.MEDIUM,
        status: TICKET_STATUS.IN_PROGRESS,
        watchers: [employee2User._id, managerUser._id],
        comments: [
          {
            author: managerUser._id,
            body: 'Great suggestion! I\'ll work on this after the current sprint. Will need to update all components.',
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
          }
        ]
      },
      {
        project: mobileProject._id,
        raisedBy: employee2User._id,
        title: 'Access to mobile testing devices',
        description: 'Need access to physical iOS and Android devices for testing. Currently only have simulators available.',
        type: TICKET_TYPES.ACCESS,
        priority: TICKET_PRIORITY.HIGH,
        status: TICKET_STATUS.OPEN,
        watchers: [employee2User._id, managerUser._id]
      },
      {
        project: demoProject._id,
        raisedBy: employeeUser._id,
        assignedTo: employee2User._id,
        title: 'Database query performance issues',
        description: 'The dashboard is loading slowly due to inefficient database queries. Page load time is around 8-10 seconds.',
        type: TICKET_TYPES.BUG,
        priority: TICKET_PRIORITY.CRITICAL,
        status: TICKET_STATUS.RESOLVED,
        watchers: [employeeUser._id, employee2User._id, managerUser._id],
        comments: [
          {
            author: employee2User._id,
            body: 'I\'ve identified the issue. The dashboard query was doing multiple N+1 queries. Fixed by adding proper joins.',
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
          },
          {
            author: employeeUser._id,
            body: 'Tested the fix. Dashboard now loads in under 2 seconds. Great work!',
            createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
          }
        ]
      },
      {
        project: mobileProject._id,
        raisedBy: managerUser._id,
        title: 'Weekly team standup scheduling',
        description: 'Need to establish regular weekly standup meetings for the mobile team to track progress and blockers.',
        type: TICKET_TYPES.OTHER,
        priority: TICKET_PRIORITY.LOW,
        status: TICKET_STATUS.CLOSED,
        watchers: [managerUser._id, employee2User._id],
        comments: [
          {
            author: employee2User._id,
            body: 'How about Tuesdays at 10 AM? That works well with my schedule.',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
          },
          {
            author: managerUser._id,
            body: 'Perfect! I\'ve set up the recurring meeting. Closing this ticket.',
            createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000) // 20 hours ago
          }
        ]
      }
    ];

    await Ticket.insertMany(sampleTickets);
    logger.info('🎫 Created sample tickets:', { count: sampleTickets.length });

    // Create sample leave requests
    const sampleLeaveRequests = [
      {
        employee: employeeUser._id,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(Date.now() + 34 * 24 * 60 * 60 * 1000), // 34 days from now
        reason: 'Family vacation to Europe. Booked flights and accommodations.',
        status: LEAVE_STATUS.PENDING,
        aiDecision: {
          decision: 'PENDING',
          rationale: 'Leave request requires manager approval due to project deadlines.',
          conflicts: ['Project milestone deadline on day 32'],
          actions: ['Manager review required', 'Check team coverage'],
          notify: ['Project manager'],
          questions: []
        },
        history: [{
          by: employeeUser._id,
          action: 'CREATED',
          note: 'Leave request submitted for Europe vacation',
          at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        }]
      },
      {
        employee: employee2User._id,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        reason: 'Medical appointment and recovery time',
        status: LEAVE_STATUS.APPROVED,
        decidedBy: managerUser._id,
        decidedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
        decisionNote: 'Approved for medical reasons. Hope you feel better soon!',
        aiDecision: {
          decision: 'APPROVED',
          rationale: 'Medical leave with adequate notice and team coverage available.',
          conflicts: [],
          actions: ['Approve request', 'Update leave balance'],
          notify: ['Employee', 'HR'],
          questions: []
        },
        history: [
          {
            by: employee2User._id,
            action: 'CREATED',
            note: 'Medical leave request submitted',
            at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
          },
          {
            by: managerUser._id,
            action: 'APPROVED',
            note: 'Approved for medical reasons. Hope you feel better soon!',
            at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) // 12 days ago
          }
        ]
      },
      {
        employee: employeeUser._id,
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        endDate: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000), // 43 days ago
        reason: 'Wedding anniversary celebration',
        status: LEAVE_STATUS.APPROVED,
        decidedBy: managerUser._id,
        decidedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), // 50 days ago
        decisionNote: 'Enjoy your anniversary!',
        aiDecision: {
          decision: 'APPROVED',
          rationale: 'Short leave with good advance notice and no conflicts.',
          conflicts: [],
          actions: ['Approve request', 'Update leave balance'],
          notify: ['Employee'],
          questions: []
        },
        history: [
          {
            by: employeeUser._id,
            action: 'CREATED',
            note: 'Anniversary leave request',
            at: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000) // 52 days ago
          },
          {
            by: managerUser._id,
            action: 'APPROVED',
            note: 'Enjoy your anniversary!',
            at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) // 50 days ago
          }
        ]
      }
    ];

    await LeaveRequest.insertMany(sampleLeaveRequests);
    logger.info('🏖️ Created sample leave requests:', { count: sampleLeaveRequests.length });

    logger.info('✅ Database seeding completed successfully!');
    logger.info('\n📋 Demo Accounts:');
    logger.info('   Admin:     admin@workboard.dev / Admin@123');
    logger.info('   Manager:   manager@workboard.dev / Manager@123');
    logger.info('   Employee1: employee@workboard.dev / Employee@123');
    logger.info('   Employee2: employee2@workboard.dev / Employee@123');
    logger.info('\n🚀 Features seeded:');
    logger.info('   • 2 Projects with tasks across all statuses');
    logger.info('   • 5 Sample tickets (Bug, Request, Access, Other)');
    logger.info('   • 3 Leave requests (Pending, Approved, Historical)');
    logger.info('   • Real-time chat rooms for each project');
    logger.info('   • Task assignment and management');
    logger.info('   • AI leave management with DeepSeek integration');
    logger.info('\n📚 You can now start the development server and login with any of these accounts.');

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