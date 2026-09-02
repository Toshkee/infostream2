// Read on the server only (layout at build/render time, chat route per
// request). Set ASSISTANT_ENABLED=0 to remove the chat widget and refuse
// /api/chat; anything else (including unset) leaves it on.
export const assistantEnabled = () => process.env.ASSISTANT_ENABLED?.trim() !== "0";
