import type { RedactionFinding, RiskSeverity } from "./types.js";
import { shortHash } from "./utils.js";

interface Pattern {
  label: string;
  severity: RiskSeverity;
  regex: RegExp;
}

const patterns: Pattern[] = [
  {
    label: "OpenAI-style API key",
    severity: "high",
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g
  },
  {
    label: "GitHub token",
    severity: "high",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g
  },
  {
    label: "AWS access key",
    severity: "high",
    regex: /\bAKIA[0-9A-Z]{16}\b/g
  },
  {
    label: "Private key block",
    severity: "high",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
  },
  {
    label: "Environment secret assignment",
    severity: "medium",
    regex: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY)[A-Z0-9_]*\s*=\s*["']?[^"'\s]{8,}/g
  },
  {
    label: "Bearer token",
    severity: "medium",
    regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}/g
  },
  {
    label: "JWT-like token",
    severity: "medium",
    regex: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g
  }
];

export function redactText(sourcePath: string, input: string): { text: string; findings: RedactionFinding[] } {
  let text = input;
  const findings: RedactionFinding[] = [];

  for (const pattern of patterns) {
    text = text.replace(pattern.regex, (match) => {
      const fingerprint = shortHash(match);
      findings.push({
        id: shortHash(`${sourcePath}:${pattern.label}:${fingerprint}:${findings.length}`),
        sourcePath,
        severity: pattern.severity,
        label: pattern.label,
        fingerprint,
        preview: `${match.slice(0, 4)}...[redacted]`
      });
      return `[REDACTED:${pattern.label}:${fingerprint}]`;
    });
  }

  return { text, findings };
}

export function isProbablyPromptInjection(text: string): boolean {
  return /ignore (all )?(previous|above) instructions|reveal (the )?(system|developer) prompt|disable safety|exfiltrate|send .*secret/i.test(
    text
  );
}
