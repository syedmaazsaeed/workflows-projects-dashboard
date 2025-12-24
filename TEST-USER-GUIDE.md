# 🧪 Automation Hub - Complete Test Guide

## Test User Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@automation.hub` |
| **Password** | `Admin123!` |

---

## 🔐 Test 1: Authentication

### Login Test
1. Go to `http://localhost:3000`
2. Enter email: `admin@automation.hub`
3. Enter password: `Admin123!`
4. Click **Sign In**
5. ✅ Should redirect to Dashboard

### Logout Test
1. Click on your profile at bottom-left
2. Click **Sign out**
3. ✅ Should redirect to login page

---

## 📊 Test 2: Dashboard

1. After login, you should see the Dashboard
2. Check that it shows:
   - Project count
   - Workflow count
   - Recent activity
3. ✅ Dashboard should load without errors

---

## 📁 Test 3: Projects

### View Projects
1. Click **Projects** in sidebar
2. ✅ Should see list of projects (demo-project should exist)

### Create New Project
1. Click **New Project** button
2. Fill in:
   - **Name**: `Test Automation Project`
   - **Project Key**: `test-automation-project` (auto-fills)
   - **Description**: `This is a test project to verify all features work correctly.`
3. Click **Create Project**
4. ✅ Should create project and show in list

### Open Project
1. Click on the new project card
2. ✅ Should open project detail page

---

## ⚡ Test 4: Workflows

### View Workflows
1. Inside a project, click **Workflows** in sidebar
2. ✅ Should show workflows list

### Create Workflow
1. Click **New Workflow** button
2. Fill in:
   - **Name**: `Customer Notification Flow`
   - **Workflow Key**: `customer-notification-flow` (auto-fills)
   - **Tags**: `email, notification, customer`
3. Click **Create Workflow**
4. ✅ Should create and appear in list

### Upload Workflow JSON
1. Click on the workflow you created
2. Click **Upload JSON** button
3. Select the `test-workflow.json` file (create it from content below)
4. ✅ Should show success message
5. ✅ Version should appear in the list

---

## 🔗 Test 5: Webhooks

### Create Webhook
1. Click **Webhooks** in sidebar
2. Click **New Webhook** button
3. Fill in:
   - **Webhook Key**: `github-push-events`
   - **Description**: `Receives GitHub push event notifications`
   - **Routing Type**: Forward to URL
   - **Target URL**: `https://httpbin.org/post`
4. Click **Create Webhook**
5. ✅ Should show webhook secret - **COPY THIS!**
6. ✅ Should show the endpoint URL

### Test Webhook (Optional - requires curl/Postman)
```bash
curl -X POST http://localhost:4000/api/webhooks/test-automation-project/github-push-events \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET_HERE" \
  -d '{"event": "push", "repository": "test-repo"}'
```

---

## 🔑 Test 6: Secrets

### Create Secret
1. Click **Secrets** in sidebar
2. Click **New Secret** button
3. Fill in:
   - **Secret Key**: `OPENAI_API_KEY`
   - **Secret Value**: `sk-test-1234567890abcdef`
4. Click **Create Secret**
5. ✅ Should appear in secrets list (value hidden)

### Create Another Secret
1. Click **New Secret** button
2. Fill in:
   - **Secret Key**: `DATABASE_PASSWORD`
   - **Secret Value**: `super-secure-password-123`
3. Click **Create Secret**
4. ✅ Should appear in list

### Delete Secret
1. Click the trash icon on one of the secrets
2. Confirm deletion
3. ✅ Secret should be removed

---

## 📄 Test 7: Documents

### Create Document
1. Click **Docs** in sidebar
2. Click **New Document** button
3. Fill in:
   - **Title**: `Getting Started Guide`
   - **Type**: Readme
   - **Content**:
```markdown
# Getting Started

Welcome to the Test Automation Project!

## Prerequisites

- Node.js 18+
- Docker
- n8n installed

## Quick Start

1. Clone the repository
2. Run `npm install`
3. Start the services with `docker-compose up`

## Features

- **Workflows**: Upload and version your n8n workflows
- **Webhooks**: Create secure webhook endpoints
- **Secrets**: Store API keys securely
- **Documents**: Keep all documentation in one place

## Support

Contact support@example.com for help.
```
4. Click **Create Document**
5. ✅ Should appear in documents list

---

## 💬 Test 8: AI Chat (if configured)

1. Click **Chat** in sidebar
2. Click **New Chat** or start typing
3. Try asking: `What workflows do we have in this project?`
4. ✅ Should respond (if AI is configured) or show error message

---

## 🔄 Test 9: Search & Filter

### Search Projects
1. Go to Projects page
2. Type in search box: `test`
3. ✅ Should filter to show only matching projects

### Search Workflows
1. Go to Workflows page
2. Search by name or tag
3. ✅ Should filter results

---

## ✏️ Test 10: Edit & Update

### Update Workflow
1. Upload a second JSON to the same workflow
2. ✅ Should create version 2
3. ✅ Both versions should be visible

---

## 🎯 Quick Checklist

| Feature | Status |
|---------|--------|
| ☐ Login works |  |
| ☐ Dashboard loads |  |
| ☐ Can create project |  |
| ☐ Can view project |  |
| ☐ Can create workflow |  |
| ☐ Can upload JSON |  |
| ☐ Can create webhook |  |
| ☐ Can create secret |  |
| ☐ Can delete secret |  |
| ☐ Can create document |  |
| ☐ Search works |  |
| ☐ Logout works |  |

---

## 📝 Notes

- All timestamps should show relative time (e.g., "just now", "2 hours ago")
- Error messages should appear as alerts when something fails
- The UI should be responsive on mobile devices


