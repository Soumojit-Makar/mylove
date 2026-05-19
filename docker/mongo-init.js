// MongoDB init script — creates DB, user, seed data
db = db.getSiblingDB('nexuscrm');

db.createUser({
  user: 'nexuscrm_app',
  pwd: 'nexuscrm_app_secret',
  roles: [{ role: 'readWrite', db: 'nexuscrm' }]
});

// Seed super-admin user (password: password123 — bcrypt)
db.users.insertOne({
  name: 'Sarah Adams',
  email: 'admin@nexuscrm.io',
  password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/lSvYVPC',
  role: 'super_admin',
  tenant_id: 'tenant_demo_001',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
});

// Seed demo tenant config
db.tenants.insertOne({
  _id: 'tenant_demo_001',
  name: 'NexusCRM Demo Corp',
  domain: 'nexus.crm.io',
  plan: 'enterprise',
  created_at: new Date()
});

print('MongoDB initialized successfully');
