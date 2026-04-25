import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuleBasedSuggestion,
  calculatePortfolioSummary,
  deriveProjectHealth,
  normalizeSuggestion
} from "../lib/business-value.mjs";

const healthyRepo = {
  label: "public/repo",
  visibility: "public",
  defaultBranch: "main",
  version: "v1.0.0",
  lastCommitAgeDays: 2,
  openPullRequests: 1,
  workflow: {
    status: "passing",
    successRate: 95,
    lastRunAt: "2026-04-24T10:00:00.000Z"
  }
};

const healthyJira = {
  projectKey: "APP",
  deliveryHealth: "healthy",
  openIssues: 3,
  inProgressIssues: 1,
  doneLast30Days: 8,
  blockers: 0,
  overdue: 0,
  updatedLast7Days: 5
};

test("rejects low-value AI suggestions instead of creating busywork", () => {
  const normalized = normalizeSuggestion({
    nextStep: "Refactor internal naming.",
    businessValueDriver: "portfolio credibility",
    expectedImpact: "Minimal visible change.",
    effortLevel: "low",
    confidence: 0.9,
    whyNow: "It would be tidy.",
    riskIfIgnored: "None.",
    valueScore: 31,
    noHighValueAction: false
  });

  assert.equal(normalized.noHighValueAction, true);
  assert.equal(normalized.nextStep, "No high-value action right now.");
  assert.equal(normalized.businessValueDriver, "maintain/monitor");
});

test("prioritizes Jira blockers over adding new scope", () => {
  const suggestion = buildRuleBasedSuggestion({
    status: "development",
    repo: healthyRepo,
    jira: {
      ...healthyJira,
      blockers: 2
    }
  });

  assert.equal(suggestion.noHighValueAction, false);
  assert.equal(suggestion.businessValueDriver, "delivery speed");
  assert.equal(suggestion.valueScore >= 80, true);
});

test("returns no action when there is no clear business value", () => {
  const suggestion = buildRuleBasedSuggestion({
    status: "published_to_production",
    repo: healthyRepo,
    jira: healthyJira
  });

  assert.equal(suggestion.noHighValueAction, true);
});

test("derives attention health from failing automation", () => {
  const health = deriveProjectHealth(
    {
      ...healthyRepo,
      workflow: {
        ...healthyRepo.workflow,
        status: "failing"
      }
    },
    healthyJira
  );

  assert.equal(health, "risk");
});

test("calculates the portfolio summary", () => {
  const project = {
    status: "published_to_production",
    health: "risk",
    ai: {
      valueScore: 88
    }
  };

  assert.deepEqual(calculatePortfolioSummary([project, { ...project, status: "development", health: "healthy" }]), {
    totalProjects: 2,
    productionReady: 1,
    needsAttention: 1,
    averageValueScore: 88
  });
});
