export type AssistantId = "todoist" | "hats";
export type AssistantConfig = {
  id: AssistantId;
  name: string;
  systemPromptPath: string;
  knowledgeDir?: string;
  stateless?: boolean;
  tools?: string[];
  replyStyle?: "bubbles" | "plain";
};
