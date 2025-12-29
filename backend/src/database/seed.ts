import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Database connection for seeding
const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://automation:automation_secret@localhost:5432/automation_hub',
  synchronize: false,
  logging: true,
});

async function seed() {
  console.log('🌱 Starting database seed...');

  await AppDataSource.initialize();
  console.log('📦 Database connected');

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    // Create pgvector extension (for vector search)
    console.log('📦 Setting up pgvector extension...');
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
      console.log('✅ pgvector extension ready');
    } catch (error) {
      console.warn('⚠️  pgvector extension not available (optional for vector search)');
    }

    // Create admin user
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash('03106902002M@@z', 12);

    await queryRunner.query(`
      INSERT INTO users (id, name, email, password_hash, role, email_verified, is_approved)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        email_verified = EXCLUDED.email_verified,
        is_approved = EXCLUDED.is_approved
    `, [adminId, 'Admin User', 'syedmaazsaeed@gmail.com', passwordHash, 'ADMIN', true, true]);

    console.log('✅ Admin user created: syedmaazsaeed@gmail.com');

    // Create a sample project
    const projectId = uuidv4();
    await queryRunner.query(`
      INSERT INTO projects (id, name, project_key, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `, [
      projectId,
      'Demo Automation Project',
      'demo-project',
      'A sample project demonstrating the Automation Hub features',
      adminId,
    ]);

    console.log('✅ Sample project created: demo-project');

    // Add admin as project member
    await queryRunner.query(`
      INSERT INTO project_members (id, project_id, user_id, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_id) DO NOTHING
    `, [uuidv4(), projectId, adminId, 'ADMIN']);

    // Create a sample workflow
    const workflowId = uuidv4();
    await queryRunner.query(`
      INSERT INTO workflows (id, project_id, name, workflow_key, tags, status, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (project_id, workflow_key) DO UPDATE SET
        name = EXCLUDED.name,
        tags = EXCLUDED.tags
    `, [
      workflowId,
      projectId,
      'Email Notification Workflow',
      'email-notification',
      ['email', 'notifications', 'automation'],
      'ACTIVE',
      'MANUAL_UPLOAD',
    ]);

    console.log('✅ Sample workflow created: email-notification');

    // Create a sample webhook
    const webhookId = uuidv4();
    const webhookSecret = 'demo-webhook-secret-123';
    const webhookSecretHash = await bcrypt.hash(webhookSecret, 12);

    await queryRunner.query(`
      INSERT INTO webhooks (id, project_id, hook_key, description, secret_hash, is_enabled, routing_type, target_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (project_id, hook_key) DO UPDATE SET
        description = EXCLUDED.description,
        routing_type = EXCLUDED.routing_type
    `, [
      webhookId,
      projectId,
      'github-events',
      'Receives GitHub webhook events',
      webhookSecretHash,
      true,
      'FORWARD_URL',
      'https://httpbin.org/post',
    ]);

    console.log('✅ Sample webhook created: github-events');
    console.log(`   Secret: ${webhookSecret}`);
    console.log(`   Endpoint: POST /api/webhooks/demo-project/github-events`);

    // Create a sample document
    const docId = uuidv4();
    await queryRunner.query(`
      INSERT INTO documents (id, project_id, doc_type, title, content_md, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [
      docId,
      projectId,
      'README',
      'Project Overview',
      `# Demo Automation Project

Welcome to the Demo Automation Project! This project showcases the features of Automation Hub.

## Features

- **Workflows**: Manage n8n workflow JSON files with versioning
- **Webhooks**: Create secure webhook endpoints with routing
- **Documents**: Store project documentation in markdown
- **Secrets**: Securely store API keys and credentials
- **AI Chat**: Ask questions about your workflows and docs

## Getting Started

1. Upload your workflow JSON files
2. Create webhook endpoints
3. Add documentation
4. Use the AI chatbot to explore your project

## Sample Workflow

The email-notification workflow demonstrates:
- Webhook trigger
- HTTP request node
- Email sending

## Links

- [n8n Documentation](https://docs.n8n.io/)
- [Automation Hub Guide](https://github.com/automation-hub)
`,
      adminId,
    ]);

    console.log('✅ Sample document created: Project Overview');

    // Create sample workflow JSON and version
    const sampleWorkflowJson = {
      name: 'Email Notification Workflow',
      nodes: [
        {
          id: 'webhook',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          position: [250, 300],
          parameters: {
            path: 'email-trigger',
            httpMethod: 'POST',
          },
        },
        {
          id: 'http',
          name: 'Send Email API',
          type: 'n8n-nodes-base.httpRequest',
          position: [500, 300],
          parameters: {
            method: 'POST',
            url: 'https://api.email-service.com/send',
            bodyParametersUi: {
              parameter: [
                { name: 'to', value: '={{ $json.email }}' },
                { name: 'subject', value: '={{ $json.subject }}' },
                { name: 'body', value: '={{ $json.body }}' },
              ],
            },
          },
        },
      ],
      connections: {
        'Webhook Trigger': {
          main: [[{ node: 'Send Email API', type: 'main', index: 0 }]],
        },
      },
      settings: {
        executionOrder: 'v1',
      },
    };

    // Store workflow version (simplified - just metadata for demo)
    const versionId = uuidv4();
    await queryRunner.query(`
      INSERT INTO workflow_versions (id, workflow_id, version, json_storage_url, json_hash, metadata, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (workflow_id, version) DO NOTHING
    `, [
      versionId,
      workflowId,
      1,
      `workflows/${projectId}/${workflowId}/v1.json`,
      'demo-hash-12345',
      JSON.stringify({
        nodeCount: 2,
        nodeTypes: ['n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest'],
        triggers: ['Webhook Trigger'],
        webhooks: ['email-trigger'],
        servicesUsed: ['webhook', 'httpRequest'],
        connections: 1,
      }),
      adminId,
    ]);

    console.log('✅ Sample workflow version created');

    // Create audit log entries
    await queryRunner.query(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details)
      VALUES 
        ($1, $2, 'PROJECT_CREATE', 'project', $3, $4),
        ($5, $2, 'WORKFLOW_CREATE', 'workflow', $6, $7),
        ($8, $2, 'WEBHOOK_CREATE', 'webhook', $9, $10)
    `, [
      uuidv4(), adminId, projectId, JSON.stringify({ projectKey: 'demo-project' }),
      uuidv4(), workflowId, JSON.stringify({ workflowKey: 'email-notification' }),
      uuidv4(), webhookId, JSON.stringify({ hookKey: 'github-events' }),
    ]);

    console.log('✅ Audit logs created');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: syedmaazsaeed@gmail.com');
    console.log('   Password: 03106902002M@@z');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch(console.error);

