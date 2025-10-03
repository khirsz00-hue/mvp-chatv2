import fs from "node:fs";
import path from "node:path";
import { assistants } from "./config";
import type { AssistantId } from "./types";

export function readPrompt(assistantId: AssistantId): string {
  const conf = assistants[assistantId];
  const p = path.resolve(process.cwd(), conf.systemPromptPath);
  return fs.readFileSync(p, "utf8");
}
export function readKnowledge(assistantId: AssistantId): string {
  const conf = assistants[assistantId];
  if (!conf.knowledgeDir) return "";
  const dir = path.resolve(process.cwd(), conf.knowledgeDir);
  if (!fs.existsSync(dir)) return "";
  const files = fs.readdirSync(dir).filter(f=>f.endsWith(".md"));
  return files.map(f=>fs.readFileSync(path.join(dir,f),"utf8")).join("\n\n");
}
