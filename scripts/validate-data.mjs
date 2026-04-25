import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("public/dashboard-data.json", "utf8"));

assertString(data.generatedAt, "generatedAt");
assertArray(data.projects, "projects");

for (const project of data.projects) {
  assertString(project.id, "project.id");
  assertString(project.displayName, `${project.id}.displayName`);
  assertString(project.description, `${project.id}.description`);
  assertString(project.repo?.version, `${project.id}.repo.version`);
  assertString(project.ai?.nextStep, `${project.id}.ai.nextStep`);
  assertNumber(project.ai?.valueScore, `${project.id}.ai.valueScore`);

  if (project.private && project.repo?.label !== "Private repository") {
    throw new Error(`${project.id} exposes a private repo label`);
  }

  if (project.ai.valueScore < 50 && !project.ai.noHighValueAction) {
    throw new Error(`${project.id} has a low-value suggestion that was not marked as no action`);
  }
}

console.log(`Validated dashboard data for ${data.projects.length} project(s).`);

function assertString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertNumber(value, name) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}
