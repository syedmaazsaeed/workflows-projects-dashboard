export default () => ({
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'automation',
    password: process.env.POSTGRES_PASSWORD || 'automation_secret',
    database: process.env.POSTGRES_DB || 'automation_hub',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    localPath: process.env.LOCAL_STORAGE_PATH || './storage',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      endpoint: process.env.S3_ENDPOINT,
    },
  },

  // AI/Embeddings
  ai: {
    embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
    llmProvider: process.env.LLM_PROVIDER || 'openai',
    llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },

  // n8n Integration
  n8n: {
    baseUrl: process.env.N8N_BASE_URL,
    apiKey: process.env.N8N_API_KEY,
  },

  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // Rate limiting
  rateLimit: {
    login: parseInt(process.env.RATE_LIMIT_LOGIN || '10', 10),
    webhook: parseInt(process.env.RATE_LIMIT_WEBHOOK || '100', 10),
    default: parseInt(process.env.RATE_LIMIT_DEFAULT || '100', 10),
  },

  // Email Configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@automationhub.com',
    },
  },
});

