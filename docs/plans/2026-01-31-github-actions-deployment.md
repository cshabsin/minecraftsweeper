# GitHub Actions Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate deployment strategy from manual `gh-pages` branch push to automated GitHub Actions workflow using GitHub Pages Actions.

**Architecture:** 
- Remove `gh-pages` npm package.
- Create a GitHub Actions workflow that triggers on push to `main`.
- The workflow will setup Node, install dependencies, build the Vite project, and deploy the `dist` artifact to GitHub Pages.

**Tech Stack:** GitHub Actions, Vite, Node.js

---

### Task 1: Clean up old deployment scripts

**Files:**
- Modify: `package.json`

**Step 1: Remove gh-pages dependency**

Execute:
```bash
npm uninstall gh-pages
```

**Step 2: Remove scripts from package.json**

Modify `package.json` to remove:
- `predeploy`
- `deploy`

**Step 3: Verify package.json is clean**

Check content of `package.json`.

**Step 4: Commit cleanup**

```bash
git add package.json package-lock.json
git commit -m "chore: remove gh-pages dependency and scripts"
```

---

### Task 2: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create the workflow file**

Create `.github/workflows/deploy.yml` with the following content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # Build job
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  # Deployment job
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Commit the workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for pages deployment"
```

**Step 3: Push changes**

```bash
git push
```

**Step 4: Verification (Manual)**

The user will need to go to GitHub Repository Settings -> Pages and set "Source" to "GitHub Actions" for this to work.
