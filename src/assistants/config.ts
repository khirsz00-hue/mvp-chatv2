import type { AssistantConfig, AssistantId } from "./types";
export const assistants: Record<AssistantId, AssistantConfig> = {
  todoist: {
    id: "todoist",
    name: "Todoist Helper",
    systemPromptPath: "src/assistants/todoist/prompt.md",
    knowledgeDir: "src/assistants/todoist/kb",
    tools: ["todoist"],
    replyStyle: "bubbles",
    stateless: false,
  },
  hats: {
    id: "hats",
    name: "Six Thinking Hats Turbo",
    systemPromptPath: "src/assistants/hats/prompt.md",
    knowledgeDir: "src/assistants/hats/kb",
    tools: [],
    replyStyle: "bubbles",
    stateless: true,
  },
};
