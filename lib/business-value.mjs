export const allowedValueDrivers = [
  "user adoption",
  "revenue potential",
  "customer trust",
  "portfolio credibility",
  "delivery speed",
  "operational reliability",
  "launch readiness",
  "cost/risk reduction",
  "maintain/monitor"
];

export function normalizeSuggestion(candidate) {
  const confidence = clamp(Number(candidate.confidence), 0, 1);
  const valueScore = Math.round(clamp(Number(candidate.valueScore), 0, 100));
  const driver = allowedValueDrivers.includes(candidate.businessValueDriver)
    ? candidate.businessValueDriver
    : "maintain/monitor";

  if (candidate.noHighValueAction || valueScore < 50 || driver === "maintain/monitor") {
    return noHighValueAction();
  }

  return {
    ...candidate,
    businessValueDriver: driver,
    effortLevel: normalizeEffort(candidate.effortLevel),
    confidence,
    valueScore,
    noHighValueAction: false
  };
}

export function buildRuleBasedSuggestion({ status, repo, jira }) {
  if ((jira.blockers ?? 0) > 0) {
    return normalizeSuggestion({
      nextStep: "Resolve the blocked Jira work before adding new scope.",
      businessValueDriver: "delivery speed",
      expectedImpact: "Improves execution predictability and protects committed delivery dates.",
      effortLevel: "medium",
      confidence: 0.86,
      whyNow: "Blocked work is the clearest constraint on visible progress.",
      riskIfIgnored: "More work may queue behind unresolved dependencies and reduce delivery confidence.",
      valueScore: 88,
      noHighValueAction: false
    });
  }

  if ((jira.overdue ?? 0) > 0) {
    return normalizeSuggestion({
      nextStep: "Re-scope overdue Jira items into a smaller milestone with a visible owner and date.",
      businessValueDriver: "customer trust",
      expectedImpact: "Restores confidence by turning late work into a credible delivery commitment.",
      effortLevel: "low",
      confidence: 0.82,
      whyNow: "Overdue work is already signaling delivery risk.",
      riskIfIgnored: "Stakeholders may read the project as unmanaged even if the code is healthy.",
      valueScore: 80,
      noHighValueAction: false
    });
  }

  if (repo.workflow.status === "failing") {
    return normalizeSuggestion({
      nextStep: "Stabilize the failing automation before promoting the project externally.",
      businessValueDriver: "operational reliability",
      expectedImpact: "Protects launch quality and reduces the chance of a public demo regression.",
      effortLevel: "medium",
      confidence: 0.88,
      whyNow: "A failing workflow weakens confidence in every release signal.",
      riskIfIgnored: "The portfolio may present a project that cannot reliably ship or deploy.",
      valueScore: 84,
      noHighValueAction: false
    });
  }

  if ((repo.lastCommitAgeDays ?? 0) > 45 && status !== "archived") {
    return normalizeSuggestion({
      nextStep: "Ship a small visible update that demonstrates active ownership.",
      businessValueDriver: "portfolio credibility",
      expectedImpact: "Signals momentum to hiring managers, partners, and technical reviewers.",
      effortLevel: "low",
      confidence: 0.76,
      whyNow: "The project has gone quiet long enough to create freshness risk.",
      riskIfIgnored: "A stale project can look abandoned even when the underlying product still works.",
      valueScore: 72,
      noHighValueAction: false
    });
  }

  if (status === "development" && repo.workflow.status === "passing" && (jira.openIssues ?? 0) < 8) {
    return normalizeSuggestion({
      nextStep: "Package the current scope into a launch-readiness milestone.",
      businessValueDriver: "launch readiness",
      expectedImpact: "Moves the project from build activity toward a clear public outcome.",
      effortLevel: "medium",
      confidence: 0.78,
      whyNow: "Engineering and delivery signals are healthy enough to define a release boundary.",
      riskIfIgnored: "The project may continue improving without producing a visible business result.",
      valueScore: 78,
      noHighValueAction: false
    });
  }

  return noHighValueAction();
}

export function deriveProjectHealth(repo, jira) {
  if ((jira.blockers ?? 0) > 0 || repo.workflow.status === "failing") return "risk";
  if ((jira.overdue ?? 0) > 2) return "watch";
  if ((repo.lastCommitAgeDays ?? 0) > 60) return "watch";
  if (repo.workflow.status === "passing" && jira.deliveryHealth === "healthy") return "excellent";
  if (repo.workflow.status === "unknown" && jira.deliveryHealth === "unknown") return "unknown";
  return "healthy";
}

export function calculatePortfolioSummary(projects) {
  const totalProjects = projects.length;
  const productionReady = projects.filter((project) => project.status === "published_to_production").length;
  const needsAttention = projects.filter((project) => ["watch", "risk", "blocked"].includes(project.health)).length;
  const averageValueScore =
    totalProjects === 0
      ? 0
      : Math.round(projects.reduce((sum, project) => sum + project.ai.valueScore, 0) / totalProjects);

  return {
    totalProjects,
    productionReady,
    needsAttention,
    averageValueScore
  };
}

function noHighValueAction() {
  return {
    nextStep: "No high-value action right now.",
    businessValueDriver: "maintain/monitor",
    expectedImpact: "Preserves focus for work with clearer business upside.",
    effortLevel: "low",
    confidence: 0.74,
    whyNow: "Current signals do not justify adding new work for its own sake.",
    riskIfIgnored: "Low. Continue monitoring delivery, reliability, and adoption signals.",
    valueScore: 42,
    noHighValueAction: true
  };
}

function normalizeEffort(value) {
  return ["low", "medium", "high"].includes(value) ? value : "medium";
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
