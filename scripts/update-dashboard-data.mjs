import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import {
  buildRuleBasedSuggestion,
  calculatePortfolioSummary,
  deriveProjectHealth,
  normalizeSuggestion
} from "../lib/business-value.mjs";
import { demoData } from "../assets/demo-data.js";

const CONFIG_PATH = "projects.config.json";
const OUTPUT_PATH = "public/dashboard-data.json";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

async function main() {
  const config = await readJson(CONFIG_PATH);

  if (!hasLiveCredentials() || config.projects.length === 0 || config.projects.every(isPlaceholderProject)) {
    await writeFallbackDemoData();
    return;
  }

  const now = new Date().toISOString();

  const projects = await Promise.all(
    config.projects.map(async (project) => {
      const repo = await collectRepoMetrics(project);
      const jira = await collectJiraMetrics(project);
      const health = deriveProjectHealth(repo, jira);
      const fallback = buildRuleBasedSuggestion({
        status: project.statusOverride,
        repo,
        jira
      });
      const ai = await collectBusinessValueSuggestion(project, repo, jira, health, fallback);

      return {
        id: project.id,
        displayName: project.displayName,
        description: project.description,
        status: project.statusOverride,
        health,
        productionUrl: project.productionUrl,
        private: project.private,
        repo,
        jira,
        ai,
        updatedAt: now
      };
    })
  );

  const dashboardData = {
    generatedAt: now,
    source: hasLiveCredentials() ? "live" : "fallback",
    portfolioSummary: calculatePortfolioSummary(projects),
    projects
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(dashboardData, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${projects.length} project(s).`);
}

function isPlaceholderProject(project) {
  return project.github.owner === "your-github-user" || project.github.repo === "your-dashboard-repo";
}

async function writeFallbackDemoData() {
  const generatedAt = new Date().toISOString();
  const fallbackData = {
    ...demoData,
    generatedAt,
    source: "fallback",
    projects: demoData.projects.map((project) => ({
      ...project,
      updatedAt: generatedAt
    }))
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(fallbackData, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with polished fallback demo data.`);
}

async function collectRepoMetrics(project) {
  const token = process.env.GITHUB_DATA_TOKEN;
  const isPlaceholder = project.github.owner === "your-github-user" || project.github.repo === "your-dashboard-repo";

  if (!token || isPlaceholder) {
    return fallbackRepoMetrics(project);
  }

  try {
    const headers = githubHeaders(token);
    const repo = await githubRequest(`/repos/${project.github.owner}/${project.github.repo}`, headers);
    const branch = project.github.defaultBranch ?? repo.default_branch;
    const [release, tags, runs, pulls, commit] = await Promise.all([
      githubRequest(`/repos/${project.github.owner}/${project.github.repo}/releases/latest`, headers, true),
      githubRequest(`/repos/${project.github.owner}/${project.github.repo}/tags?per_page=1`, headers),
      githubRequest(`/repos/${project.github.owner}/${project.github.repo}/actions/runs?per_page=20`, headers, true),
      githubRequest(`/repos/${project.github.owner}/${project.github.repo}/pulls?state=open&per_page=100`, headers),
      githubRequest(`/repos/${project.github.owner}/${project.github.repo}/commits/${branch}`, headers, true)
    ]);

    const workflowRuns = runs?.workflow_runs ?? [];
    const completedRuns = workflowRuns.filter((run) => run.status === "completed");
    const successfulRuns = completedRuns.filter((run) => run.conclusion === "success");
    const successRate =
      completedRuns.length === 0 ? null : Math.round((successfulRuns.length / completedRuns.length) * 100);
    const latestRun = workflowRuns[0];

    return {
      label: project.private ? "Private repository" : `${project.github.owner}/${project.github.repo}`,
      visibility: project.private ? "private" : "public",
      defaultBranch: repo.default_branch,
      version: selectVersion(release, tags, commit),
      releaseUrl: project.private ? undefined : release?.html_url,
      lastCommitAgeDays: daysSince(repo.pushed_at),
      openPullRequests: pulls.length,
      workflow: {
        status:
          completedRuns.length === 0
            ? "unknown"
            : latestRun?.conclusion === "success"
              ? "passing"
              : latestRun?.conclusion === "failure"
                ? "failing"
                : "unknown",
        successRate,
        lastRunAt: latestRun?.created_at ?? null
      }
    };
  } catch (error) {
    console.warn(`GitHub collection failed for ${project.displayName}:`, error);
    return fallbackRepoMetrics(project);
  }
}

async function collectJiraMetrics(project) {
  const { JIRA_API_TOKEN, JIRA_EMAIL, JIRA_SITE_URL } = process.env;

  if (!project.jiraProjectKey || !JIRA_API_TOKEN || !JIRA_EMAIL || !JIRA_SITE_URL) {
    return fallbackJiraMetrics(project);
  }

  try {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
    const jql = `project = ${project.jiraProjectKey} AND (updated >= -90d OR resolution = Unresolved)`;
    const issues = await fetchJiraIssues({
      siteUrl: JIRA_SITE_URL,
      auth,
      jql,
      fields: "status,priority,duedate,updated,resolutiondate,issuetype"
    });
    const now = new Date();
    const thirtyDaysAgo = shiftDays(now, -30);
    const sevenDaysAgo = shiftDays(now, -7);

    const openIssues = issues.filter((issue) => issue.fields.status.statusCategory.key !== "done").length;
    const inProgressIssues = issues.filter((issue) => issue.fields.status.statusCategory.key === "indeterminate").length;
    const doneLast30Days = issues.filter((issue) => {
      const resolved = issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null;
      return issue.fields.status.statusCategory.key === "done" && resolved && resolved >= thirtyDaysAgo;
    }).length;
    const blockers = issues.filter((issue) => {
      const priority = issue.fields.priority?.name?.toLowerCase() ?? "";
      return priority.includes("blocker") || priority.includes("highest");
    }).length;
    const overdue = issues.filter((issue) => {
      if (!issue.fields.duedate || issue.fields.status.statusCategory.key === "done") return false;
      return new Date(`${issue.fields.duedate}T23:59:59.000Z`) < now;
    }).length;
    const updatedLast7Days = issues.filter((issue) => new Date(issue.fields.updated) >= sevenDaysAgo).length;

    return {
      projectKey: project.jiraProjectKey,
      deliveryHealth: deriveDeliveryHealth({ blockers, overdue, openIssues }),
      openIssues,
      inProgressIssues,
      doneLast30Days,
      blockers,
      overdue,
      updatedLast7Days
    };
  } catch (error) {
    console.warn(`Jira collection failed for ${project.displayName}:`, error);
    return fallbackJiraMetrics(project);
  }
}

async function fetchJiraIssues({ siteUrl, auth, jql, fields }) {
  const issues = [];
  let nextPageToken;

  for (let page = 0; page < 5; page += 1) {
    const url = new URL("/rest/api/3/search/jql", siteUrl);
    url.searchParams.set("jql", jql);
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("fields", fields);
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) throw new Error(`Jira request failed with ${response.status}`);

    const data = await response.json();
    issues.push(...(data.issues ?? []));

    if (!data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  return issues;
}

async function collectBusinessValueSuggestion(project, repo, jira, health, fallback) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "You are an executive product advisor. Recommend a next step only when it creates measurable business value. If no worthwhile value exists, say there is no high-value action right now. Never include private repository names, Jira issue keys, issue summaries, commit messages, or internal links."
          },
          {
            role: "user",
            content: JSON.stringify({
              project: {
                displayName: project.displayName,
                description: project.description,
                status: project.statusOverride,
                health,
                private: project.private
              },
              sanitizedSignals: { repo, jira }
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "business_value_next_step",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "nextStep",
                "businessValueDriver",
                "expectedImpact",
                "effortLevel",
                "confidence",
                "whyNow",
                "riskIfIgnored",
                "valueScore",
                "noHighValueAction"
              ],
              properties: {
                nextStep: { type: "string" },
                businessValueDriver: {
                  type: "string",
                  enum: [
                    "user adoption",
                    "revenue potential",
                    "customer trust",
                    "portfolio credibility",
                    "delivery speed",
                    "operational reliability",
                    "launch readiness",
                    "cost/risk reduction",
                    "maintain/monitor"
                  ]
                },
                expectedImpact: { type: "string" },
                effortLevel: { type: "string", enum: ["low", "medium", "high"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                whyNow: { type: "string" },
                riskIfIgnored: { type: "string" },
                valueScore: { type: "number", minimum: 0, maximum: 100 },
                noHighValueAction: { type: "boolean" }
              }
            }
          }
        }
      })
    });

    if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}`);

    const body = await response.json();
    const text = extractOpenAIText(body);
    if (!text) return fallback;

    return normalizeSuggestion(JSON.parse(text));
  } catch (error) {
    console.warn(`OpenAI suggestion failed for ${project.displayName}:`, error);
    return fallback;
  }
}

function fallbackRepoMetrics(project) {
  return {
    label: project.private ? "Private repository" : `${project.github.owner}/${project.github.repo}`,
    visibility: project.private ? "private" : "public",
    defaultBranch: project.github.defaultBranch ?? "main",
    version: "demo",
    lastCommitAgeDays: null,
    openPullRequests: null,
    workflow: {
      status: "unknown",
      successRate: null,
      lastRunAt: null
    }
  };
}

function fallbackJiraMetrics(project) {
  return {
    projectKey: project.jiraProjectKey,
    deliveryHealth: "unknown",
    openIssues: null,
    inProgressIssues: null,
    doneLast30Days: null,
    blockers: null,
    overdue: null,
    updatedLast7Days: null
  };
}

function selectVersion(release, tags, commit) {
  if (release?.tag_name) return release.tag_name;
  if (tags?.[0]?.name) return tags[0].name;
  if (commit?.sha) return commit.sha.slice(0, 7);
  return "unknown";
}

function deriveDeliveryHealth({ blockers, overdue, openIssues }) {
  if (blockers > 0) return "risk";
  if (overdue > 2) return "watch";
  if (openIssues > 30) return "watch";
  return "healthy";
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function githubRequest(path, headers, allowNotFound = false) {
  const response = await fetch(`https://api.github.com${path}`, { headers });

  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub request ${path} failed with ${response.status}`);

  return response.json();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function hasLiveCredentials() {
  return Boolean(process.env.GITHUB_DATA_TOKEN && process.env.OPENAI_API_KEY);
}

function daysSince(value) {
  const difference = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.round(difference / 86_400_000));
}

function shiftDays(date, days) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function extractOpenAIText(body) {
  if (typeof body.output_text === "string") return body.output_text;

  for (const output of body.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
