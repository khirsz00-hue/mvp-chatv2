// src/assistants/types.ts
export type AssistantId = 'todoist' | 'six_hats';

export interface AssistantMeta {
  id: AssistantId;
  name: string;
}
