# AI Portfolio Project Dashboard

An executive-ready portfolio dashboard that updates daily from GitHub and Jira, then uses OpenAI to recommend the next step only when it increases business value.

## What It Builds

- Static GitHub Pages dashboard
- Collapsed current-project list with one expanded detail card
- GitHub version, workflow, freshness, and PR signals
- Jira delivery metrics by project key
- AI business-value recommendation with impact, effort, confidence, and risk
- Sanitized public `dashboard-data.json` with no private issue titles, commit messages, or private repo URLs

## Local Development

```bash
npm run dev
```

The app ships with demo data in `public/dashboard-data.json`, so it looks complete before secrets are configured.

This project is intentionally dependency-free for the challenge build. If npm is not available locally, run the same scripts directly with Node:

```bash
node scripts/serve.mjs
node scripts/update-dashboard-data.mjs
node --test tests/*.test.mjs
node scripts/build-static.mjs
```

## Configure Projects

Edit `projects.config.json`:

```json
{
  "projects": [
    {
      "id": "portfolio-dashboard",
      "displayName": "AI Portfolio Dashboard",
      "description": "Executive project status surface powered by GitHub, Jira, and AI business-value analysis.",
      "statusOverride": "development",
      "private": false,
      "productionUrl": "https://example.com/dashboard",
      "github": {
        "owner": "your-github-user",
        "repo": "your-dashboard-repo",
        "defaultBranch": "main",
        "versionSource": "release"
      },
      "jiraProjectKey": "PORT"
    }
  ]
}
```

## GitHub Actions Secrets

Store secrets in the dashboard repository:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Required for live updates:

```text
GITHUB_DATA_TOKEN
OPENAI_API_KEY
JIRA_API_TOKEN
JIRA_EMAIL
JIRA_SITE_URL
```

Optional:

```text
OPENAI_MODEL
```

Use a fine-grained GitHub token with read-only access to the repos you want to track. The public dashboard never receives these secrets; the scheduled workflow uses them to generate sanitized data.

## Commands

```bash
npm run update:data
npm run validate
npm run test
npm run build
```

## Deploy

The included workflow updates the data once per day and deploys the static app to GitHub Pages. Enable Pages for GitHub Actions in the repository settings.
