import { demoData } from "./demo-data.js";

const root = document.querySelector("#dashboard");
let dashboardData = demoData;
let expandedId = demoData.projects[0]?.id;
let fallbackActive = true;

const statusLabels = {
  development: "In development",
  working: "Working",
  degraded: "Degraded",
  not_working: "Not working",
  published_to_production: "Published",
  archived: "Archived"
};

async function boot() {
  try {
    const response = await fetch("./dashboard-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
    const loaded = await response.json();
    if (Array.isArray(loaded.projects) && loaded.projects.length > 0) {
      dashboardData = loaded;
      expandedId = loaded.projects[0].id;
      fallbackActive = loaded.source !== "live";
    }
  } catch {
    dashboardData = demoData;
    fallbackActive = true;
  }

  render();
}

function render() {
  const selected = dashboardData.projects.find((project) => project.id === expandedId) ?? dashboardData.projects[0];

  root.innerHTML = `
    <div class="page-frame">
      <header class="masthead">
        <div>
          <div class="badge-line">
            ${badge("Executive operating brief", "neutral")}
            ${fallbackActive ? badge("Demo data active", "warning") : ""}
          </div>
          <h1>Project Value Dashboard</h1>
          <p>Current portfolio projects, delivery health, and the next action only when it has a clear business reason.</p>
        </div>
        <div class="updated-block">
          <span>Last updated</span>
          <strong>${formatDateTime(dashboardData.generatedAt)}</strong>
        </div>
      </header>

      <section class="summary-grid" aria-label="Portfolio summary">
        ${summaryTile("Current projects", dashboardData.portfolioSummary.totalProjects, "target")}
        ${summaryTile("Published", dashboardData.portfolioSummary.productionReady, "shield")}
        ${summaryTile("Needs attention", dashboardData.portfolioSummary.needsAttention, "alert")}
        ${summaryTile("Avg. value score", `${dashboardData.portfolioSummary.averageValueScore}/100`, "chart")}
      </section>

      <section class="workspace-grid">
        <div class="project-list-panel">
          <div class="section-heading">
            <h2>Current Projects</h2>
            <span>${dashboardData.projects.length} tracked</span>
          </div>
          <div class="project-list">
            ${dashboardData.projects.map((project) => projectRow(project, project.id === selected.id)).join("")}
          </div>
        </div>
        ${selected ? expandedProject(selected) : ""}
      </section>
    </div>
  `;

  for (const button of root.querySelectorAll("[data-project-id]")) {
    button.addEventListener("click", () => {
      expandedId = button.getAttribute("data-project-id");
      render();
    });
  }
}

function projectRow(project, expanded) {
  return `
    <button class="project-row ${expanded ? "is-expanded" : ""}" type="button" data-project-id="${escapeAttr(project.id)}" aria-expanded="${expanded}">
      <div class="row-topline">
        <div class="row-title-block">
          <div class="row-title">
            <h3>${escapeHtml(project.displayName)}</h3>
            ${project.private ? `<span class="lock-mark" aria-label="Private project">${icon("lock")}</span>` : ""}
          </div>
          <p>${escapeHtml(project.description)}</p>
        </div>
        <span class="chevron">${icon("chevron")}</span>
      </div>
      <div class="mini-grid">
        ${miniMetric("Version", project.repo.version)}
        ${miniMetric("Status", statusLabels[project.status] ?? project.status)}
        ${miniMetric("Delivery", project.jira.deliveryHealth)}
        ${miniMetric("Value", `${project.ai.valueScore}/100`, true)}
      </div>
    </button>
  `;
}

function expandedProject(project) {
  return `
    <article class="detail-card">
      <div class="detail-header">
        <div>
          <div class="badge-line">
            ${badge(statusLabels[project.status] ?? project.status, statusTone(project.status))}
            ${badge(project.health, healthTone(project.health))}
            ${badge(`${icon("branch")} ${escapeHtml(project.repo.defaultBranch)}`, "neutral")}
          </div>
          <h2>${escapeHtml(project.displayName)}</h2>
          <p>${escapeHtml(project.description)}</p>
        </div>
        ${
          project.productionUrl
            ? `<a class="open-link" href="${escapeAttr(project.productionUrl)}" target="_blank" rel="noreferrer">Open ${icon("external")}</a>`
            : ""
        }
      </div>

      <div class="detail-body">
        <div class="metrics-column">
          <div class="metric-grid">
            ${metricTile("Version", project.repo.version, "GitHub release/tag", "branch")}
            ${metricTile("Workflow", project.repo.workflow.status, `${formatPercent(project.repo.workflow.successRate)} success`, "activity")}
            ${metricTile("Open PRs", formatNumber(project.repo.openPullRequests), "GitHub signal", "arrow")}
            ${metricTile("Commit age", project.repo.lastCommitAgeDays === null ? "Unknown" : `${project.repo.lastCommitAgeDays}d`, "Freshness", "clock")}
          </div>

          <div class="delivery-section">
            <h3>Jira Delivery</h3>
            <div class="delivery-grid">
              ${metricTile("Open", formatNumber(project.jira.openIssues))}
              ${metricTile("In progress", formatNumber(project.jira.inProgressIssues))}
              ${metricTile("Done 30d", formatNumber(project.jira.doneLast30Days))}
              ${metricTile("Blockers", formatNumber(project.jira.blockers))}
              ${metricTile("Overdue", formatNumber(project.jira.overdue))}
              ${metricTile("Updated 7d", formatNumber(project.jira.updatedLast7Days))}
            </div>
          </div>
        </div>

        <aside class="ai-panel">
          <div class="ai-heading">${icon("spark")}<h3>AI Business Next Step</h3></div>
          <div class="recommendation ${project.ai.noHighValueAction ? "is-monitor" : ""}">
            <p>${escapeHtml(project.ai.nextStep)}</p>
            <div class="badge-line">
              ${badge(project.ai.businessValueDriver, "accent")}
              ${badge(`${project.ai.effortLevel} effort`, "neutral")}
              ${badge(`${Math.round(project.ai.confidence * 100)}% confidence`, "neutral")}
            </div>
          </div>
          <dl class="insight-list">
            ${insight("Expected impact", project.ai.expectedImpact)}
            ${insight("Why now", project.ai.whyNow)}
            ${insight("Risk if ignored", project.ai.riskIfIgnored)}
          </dl>
          <div class="detail-footer">
            <span>${icon("refresh")} Updated ${formatDateTime(project.updatedAt)}</span>
            <strong>Value ${project.ai.valueScore}/100</strong>
          </div>
        </aside>
      </div>
    </article>
  `;
}

function summaryTile(label, value, iconName) {
  return `
    <div class="summary-tile">
      <div><span>${escapeHtml(label)}</span>${icon(iconName)}</div>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function metricTile(label, value, detail = "", iconName = "check") {
  return `
    <div class="metric-tile">
      <div class="metric-label"><span>${escapeHtml(label)}</span>${icon(iconName)}</div>
      <strong>${escapeHtml(String(value))}</strong>
      ${detail ? `<em>${escapeHtml(detail)}</em>` : ""}
    </div>
  `;
}

function miniMetric(label, value, strong = false) {
  return `
    <span class="mini-metric">
      <span>${escapeHtml(label)}</span>
      <strong class="${strong ? "strong" : ""}">${escapeHtml(String(value))}</strong>
    </span>
  `;
}

function insight(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function badge(content, tone) {
  return `<span class="badge ${tone}">${content}</span>`;
}

function statusTone(status) {
  return {
    development: "info",
    working: "success",
    degraded: "warning",
    not_working: "danger",
    published_to_production: "success",
    archived: "neutral"
  }[status] ?? "neutral";
}

function healthTone(health) {
  return {
    excellent: "success",
    healthy: "info",
    watch: "warning",
    risk: "danger",
    blocked: "danger",
    unknown: "neutral"
  }[health] ?? "neutral";
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function icon(name) {
  const icons = {
    activity: `<svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>`,
    alert: `<svg viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`,
    branch: `<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v1a8 8 0 0 0 8 8h1"/><path d="M6 9v12"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-7"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    external: `<svg viewBox="0 0 24 24"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    lock: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/></svg>`,
    shield: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
    spark: `<svg viewBox="0 0 24 24"><path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3Z"/></svg>`,
    target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`
  };

  return icons[name] ?? icons.check;
}

void boot();
