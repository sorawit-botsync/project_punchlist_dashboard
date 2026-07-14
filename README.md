# Project Punchlist Dashboard: Deployment & Integration Walkthrough

This guide details how to run the dashboard locally, integrate it with your SharePoint/Power Automate workflows, upgrade your database schema, and deploy the application on Vercel.

---

## 1. Local Development

Your workspace has been fully initialized with a Next.js project. To run it locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
4. The dashboard will start in **Local Mock Storage** mode automatically because the SharePoint GET endpoint URL is not yet configured.

---

## 2. Power Automate & SharePoint Configuration

The dashboard uses a serverless API proxy (`/api/punchlist`) to communicate with Power Automate. This prevents browser Cross-Origin Resource Sharing (CORS) errors.

### A. POST Flow (Creation)
- **Endpoint**: `https://default88913293a40c41c2a8eb65a54eefe2.09.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/11/workflows/11a922fa7c03498992ef8f337f050be2/triggers/manual/paths/invoke?...`
- **What is sent**: When creating an issue, the proxy receives all frontend fields but **only forwards the fields matching your current Power Automate HTTP trigger schema** to prevent validation failures:
  ```json
  {
    "title": "User-entered title",
    "description": "User-entered description",
    "status": "Open",
    "task_owner": "User-entered owner",
    "target_closed_date": "YYYY-MM-DD"
  }
  ```

### B. PATCH Flow (Updates)
- **Endpoint**: `https://default88913293a40c41c2a8eb65a54eefe2.09.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/02/workflows/055d85c5abfc45ef8123e5b968d534ad/triggers/manual/paths/invoke?...`
- **What is sent**: When saving modifications in the details drawer, the proxy sends a `PATCH` request with the required fields:
  ```json
  {
    "id": 106,
    "status": "In Progress",
    "task_owner": "priya.sharma@botsync.sg"
  }
  ```

### C. GET Flow (Query/Read Items)
- **Endpoint**: To connect the dashboard to your live SharePoint data, you must configure a Power Automate flow that pulls items from your SharePoint List and returns them as a JSON array.
- **How to connect it**:
  1. Click **Integration Settings** in the dashboard header.
  2. Paste your Power Automate GET flow trigger URL.
  3. Click **Save & Apply Settings**. The dashboard will reload and fetch live SharePoint data.
  4. (Optional) For production, define this URL as an environment variable (see below).

---

## 3. High-End Customer Success Schema Upgrades

To upgrade your tracker from a basic checklist to a premium, customer-facing issue management service, we recommend updating your SharePoint List columns and your Power Automate schemas to include the following fields:

### Suggested Columns to Add to SharePoint List:
1. `Priority` (Choice: `Low`, `Medium`, `High`, `Critical`)
2. `Category` (Choice: `Software`, `Hardware`, `Safety`, `Network`, `Other`)
3. `ReportedBy` (Single line of text: Customer name, email, or company name)

### Updated Power Automate HTTP POST Trigger JSON Schema:
```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "description": { "type": "string" },
    "status": { "type": "string" },
    "task_owner": { "type": "string" },
    "target_closed_date": { "type": "string" },
    "priority": { "type": "string" },
    "category": { "type": "string" },
    "reported_by": { "type": "string" }
  },
  "required": ["title", "description"]
}
```

### Updated Power Automate HTTP PATCH Trigger JSON Schema:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "status": { "type": "string" },
    "task_owner": { "type": "string" },
    "priority": { "type": "string" },
    "category": { "type": "string" }
  },
  "required": ["id"]
}
```

*Note: Once you update your Power Automate HTTP schemas, you can remove the filter filters inside `/src/app/api/punchlist/route.js` to forward these fields to your flows.*

---

## 4. Vercel Deployment

Deploying the dashboard to Vercel takes 3 simple steps:

### Step 1: Push Workspace Code to GitHub
Ensure all code files are committed and pushed to a repository on GitHub, GitLab, or Bitbucket.
```bash
git add .
git commit -m "feat: punchlist command center dashboard"
git push
```

### Step 2: Import Project to Vercel
1. Log into your [Vercel Account](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository (`project_punchlist_dashboard`).

### Step 3: Configure Environment Variables
Under the **Environment Variables** section in the Vercel project configuration, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `GET_PUNCHLIST_URL` | `https://...your-get-flow-trigger-url...` | Your Power Automate GET flow trigger URL (fetches SharePoint items). |
| `POST_PUNCHLIST_URL` | `https://...your-post-flow-trigger-url...` | (Optional) Override default POST trigger URL. |
| `PATCH_PUNCHLIST_URL`| `https://...your-patch-flow-trigger-url...`| (Optional) Override default PATCH trigger URL. |
| `MOCK_BACKEND` | `false` | Set to `true` to force mock database mode on Vercel. |

Click **Deploy**! Vercel will build and serve your punchlist dashboard.
