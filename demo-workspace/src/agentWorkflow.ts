export interface AgentHandoff {
  task: string;
  contextFiles: string[];
  verification: string[];
}

export function createHandoff(task: string): AgentHandoff {
  return {
    task,
    contextFiles: ["AGENTS.md", "README.md", "package.json"],
    verification: ["npm run lint", "npm run build", "npm run smoke"]
  };
}
