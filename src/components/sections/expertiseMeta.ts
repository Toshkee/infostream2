import type { IconName } from "./visuals";

// Icons for each expertise domain's capability labels — structure in code,
// copy in dict: the i-th icon badges the dict item's capabilities[i]. Shared
// by the pinned Expertise section and the /expertise/[domain] subpages (kept
// out of visuals.tsx so server components can import it as plain data).
export const CAP_ICONS: Record<string, IconName[]> = {
  finance: ["database", "landmark", "trendingUp", "fileText", "barChart"],
  hr: ["search", "list", "users", "clipboardCheck"],
  healthcare: ["shieldCheck", "fileText", "activity", "barChart"],
  dms: ["fileText", "database", "refresh", "server"],
};
