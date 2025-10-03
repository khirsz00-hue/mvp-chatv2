// ... w sendMsg() po `const data = await res.json();`
const toolResult =
  data && typeof data.toolResult === "object" && data.toolResult !== null && "result" in data.toolResult
    ? (data.toolResult.result as any)
    : data.toolResult;

setMessages(m=>[
  ...m,
  { role:'assistant', content: stripTool(data.content||""), toolResult }
]);
