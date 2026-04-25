export const demoData = {
  generatedAt: "2026-04-24T22:00:00.000Z",
  source: "demo",
  portfolioSummary: {
    totalProjects: 4,
    productionReady: 1,
    needsAttention: 2,
    averageValueScore: 78
  },
  projects: [
    {
      id: "portfolio-dashboard",
      displayName: "AI Portfolio Dashboard",
      description: "Executive project status surface powered by GitHub, Jira, and AI business-value analysis.",
      status: "development",
      health: "healthy",
      productionUrl: "https://example.com/dashboard",
      private: false,
      repo: {
        label: "portfolio/dashboard",
        visibility: "public",
        defaultBranch: "main",
        version: "v0.4.0",
        lastCommitAgeDays: 1,
        openPullRequests: 2,
        workflow: {
          status: "passing",
          successRate: 96,
          lastRunAt: "2026-04-24T20:30:00.000Z"
        }
      },
      jira: {
        projectKey: "PORT",
        deliveryHealth: "healthy",
        openIssues: 9,
        inProgressIssues: 3,
        doneLast30Days: 18,
        blockers: 0,
        overdue: 1,
        updatedLast7Days: 11
      },
      ai: {
        nextStep: "Package the current scope into a launch-readiness milestone.",
        businessValueDriver: "launch readiness",
        expectedImpact: "Moves the dashboard from impressive prototype to a credible portfolio product.",
        effortLevel: "medium",
        confidence: 0.78,
        whyNow: "Delivery and automation signals are healthy enough to define a public release boundary.",
        riskIfIgnored: "The project may keep improving without producing a visible business result.",
        valueScore: 82,
        noHighValueAction: false
      },
      updatedAt: "2026-04-24T22:00:00.000Z"
    },
    {
      id: "revenue-ops-console",
      displayName: "Revenue Ops Console",
      description: "Internal operating view for pipeline health, customer handoffs, and renewal readiness.",
      status: "published_to_production",
      health: "excellent",
      productionUrl: "https://example.com/revenue-ops",
      private: true,
      repo: {
        label: "Private repository",
        visibility: "private",
        defaultBranch: "main",
        version: "v1.7.2",
        lastCommitAgeDays: 3,
        openPullRequests: 1,
        workflow: {
          status: "passing",
          successRate: 98,
          lastRunAt: "2026-04-24T15:45:00.000Z"
        }
      },
      jira: {
        projectKey: "REV",
        deliveryHealth: "healthy",
        openIssues: 14,
        inProgressIssues: 4,
        doneLast30Days: 31,
        blockers: 0,
        overdue: 0,
        updatedLast7Days: 23
      },
      ai: {
        nextStep: "No high-value action right now.",
        businessValueDriver: "maintain/monitor",
        expectedImpact: "Preserves delivery focus for work with clearer upside.",
        effortLevel: "low",
        confidence: 0.74,
        whyNow: "The project is live, active, and operating without delivery or reliability risk.",
        riskIfIgnored: "Low. Continue monitoring reliability and adoption signals.",
        valueScore: 42,
        noHighValueAction: true
      },
      updatedAt: "2026-04-24T22:00:00.000Z"
    },
    {
      id: "customer-insights-lab",
      displayName: "Customer Insights Lab",
      description: "Experimentation workspace for feedback clustering, product signals, and discovery notes.",
      status: "working",
      health: "watch",
      private: true,
      repo: {
        label: "Private repository",
        visibility: "private",
        defaultBranch: "main",
        version: "tag-2026.04",
        lastCommitAgeDays: 54,
        openPullRequests: 0,
        workflow: {
          status: "passing",
          successRate: 91,
          lastRunAt: "2026-04-18T17:15:00.000Z"
        }
      },
      jira: {
        projectKey: "CIL",
        deliveryHealth: "watch",
        openIssues: 21,
        inProgressIssues: 2,
        doneLast30Days: 5,
        blockers: 0,
        overdue: 3,
        updatedLast7Days: 4
      },
      ai: {
        nextStep: "Re-scope overdue Jira items into a smaller milestone with a visible owner and date.",
        businessValueDriver: "customer trust",
        expectedImpact: "Restores confidence by turning late work into a credible delivery commitment.",
        effortLevel: "low",
        confidence: 0.82,
        whyNow: "Overdue discovery work is creating ambiguity around what will become customer-visible.",
        riskIfIgnored: "Stakeholders may read the project as unmanaged even if the underlying idea is strong.",
        valueScore: 80,
        noHighValueAction: false
      },
      updatedAt: "2026-04-24T22:00:00.000Z"
    },
    {
      id: "launch-readiness-api",
      displayName: "Launch Readiness API",
      description: "API layer for release readiness, environment checks, and production confidence signals.",
      status: "degraded",
      health: "risk",
      private: false,
      repo: {
        label: "portfolio/launch-readiness-api",
        visibility: "public",
        defaultBranch: "main",
        version: "v0.9.1",
        lastCommitAgeDays: 5,
        openPullRequests: 4,
        workflow: {
          status: "failing",
          successRate: 62,
          lastRunAt: "2026-04-24T18:10:00.000Z"
        }
      },
      jira: {
        projectKey: "LRA",
        deliveryHealth: "risk",
        openIssues: 17,
        inProgressIssues: 6,
        doneLast30Days: 12,
        blockers: 2,
        overdue: 1,
        updatedLast7Days: 14
      },
      ai: {
        nextStep: "Resolve the blocked Jira work before adding new scope.",
        businessValueDriver: "delivery speed",
        expectedImpact: "Improves execution predictability and protects the launch-readiness story.",
        effortLevel: "medium",
        confidence: 0.86,
        whyNow: "Blocked delivery work and failing automation are both pointing at launch risk.",
        riskIfIgnored: "More work may queue behind unresolved dependencies and reduce delivery confidence.",
        valueScore: 88,
        noHighValueAction: false
      },
      updatedAt: "2026-04-24T22:00:00.000Z"
    }
  ]
};
