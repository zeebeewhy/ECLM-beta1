/**
 * Universal LLM Client
 * Sends requests to /api/chat (same-origin proxy)
 * Supports any OpenAI-compatible API via x-* headers
 */

import type { ContrastiveAnalysis, DialogueTurn, Construction } from '@/types';

// ===== Config =====

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT: LLMConfig = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

const STORAGE_KEY = 'eclm_config';

let config: LLMConfig = loadConfig();

function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT };
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getConfig(): LLMConfig { return { ...config }; }

export function setConfig(partial: Partial<LLMConfig>) {
  config = { ...config, ...partial };
  saveConfig();
}

export const PRESETS: Record<string, { baseUrl: string; model: string; label: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', label: 'OpenAI' },
  kimi:   { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', label: 'Kimi' },
  azure:  { baseUrl: 'https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT', model: 'gpt-4o', label: 'Azure' },
  custom: { baseUrl: '', model: '', label: 'Custom' },
};

// ===== Core API Call =====

export class LLMError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(status === 0 ? `Network: ${detail}` : `API ${status}: ${detail}`);
    this.status = status;
  }
}

async function callProxy(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.7,
): Promise<string> {
  if (!config.apiKey) throw new LLMError(0, 'No API key. Go to Settings.');
  if (!config.baseUrl) throw new LLMError(0, 'No base URL.');
  if (!config.model) throw new LLMError(0, 'No model.');

  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-base-url': config.baseUrl,
        'x-model': config.model,
      },
      body: JSON.stringify({ messages, temperature, max_tokens: 2000, stream: false }),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('Failed to fetch')) {
      throw new LLMError(0, 'Cannot reach proxy. If testing locally, proxy only works on Vercel. Deploy first, or use a CORS extension for local testing.');
    }
    throw new LLMError(0, msg);
  }

  let data: Record<string, unknown>;
  try { data = await res.json(); } catch { throw new LLMError(res.status, 'Invalid JSON response'); }

  if (!res.ok) {
    const detail = ((data.error as Record<string, string>)?.message) || (data.error as string) || JSON.stringify(data);
    throw new LLMError(res.status, detail);
  }

  const content = (data.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content;
  if (!content) throw new LLMError(0, 'Empty response');
  return content;
}

export async function testConnection(): Promise<string> {
  const r = await callProxy([{ role: 'user', content: 'Say "OK" only.' }], 0.1);
  return r.trim();
}

// ===== Contrastive Analysis =====

const CONSTRUCTION_LIST = `
c-although-clause: "[Although] S V, S V" — concession clause [B2]
c-despite-np: "Despite NP, S V" — concession with noun phrase [B2]
c-however: "X. However, Y." — contrast [B1]
c-on-the-other-hand: "On one hand... on the other hand" — balanced view [B2]
c-because-clause: "S V because S V" — reason [A2]
c-due-to: "Due to NP, S V" — formal cause [B2]
c-as-a-result: "As a result, Y." — result [B1]
c-this-leads-to: "This leads to NP" — nominalized result [B2]
c-widely-acknowledged: "It is widely acknowledged that" — consensus [C1]
c-there-is-no-doubt: "There is no doubt that" — certainty [B2]
c-it-is-crucial: "It is crucial that" — necessity [B2]
c-it-is-important: "It is important to note that" — attention [B2]
c-from-my-perspective: "From my perspective" — opinion [B2]
c-i-believe: "I believe that" — strong position [B2]
c-it-seems-to-me: "It seems to me that" — tentative opinion [B2]
c-not-only-but-also: "Not only X but also Y" — emphasis [B2]
c-what-is-more: "What is more" — addition [B1]
c-in-conclusion: "In conclusion" — summary [B1]
c-taking-everything-into-account: "Taking everything into account" — final judgment [C1]
c-for-instance: "For instance" — example [B1]
c-to-take-one-example: "To take one example" — detailed example [C1]
c-provided-that: "Provided that S V" — positive condition [B2]
c-significant: "a significant NP" — academic severity [B2]
c-substantial: "a substantial NP" — academic severity [B2]
c-pressing-concern: "a pressing concern" — urgency [B2]
c-existential-threat: "an existential threat" — maximum severity [C1]
c-increasingly: "increasingly ADJ" — growing trend [B2]
c-a-growing-number: "a growing number of" — quantitative growth [B2]
c-has-the-potential-to: "has the potential to" — future possibility [B2]
c-while-admittedly: "While it is true that X, Y" — polite concession [C1]
c-it-is-worth-noting: "It is worth noting that" — interesting point [C1]
c-by-contrast: "By contrast" — difference highlight [B2]
c-to-begin-with: "To begin with" — first point [B1]
c-play-a-role: "plays a significant role in" — importance [B2]
c-i-am-convinced: "I am convinced that" — strong conviction [C1]
c-moreover: "Moreover" — formal addition [B1]
c-nevertheless: "Nevertheless" — formal contrast [B2]
c-whereas: "Whereas X, Y" — formal contrast [B2]
c-in-addition: "In addition" — addition [B1]
c-therefore: "Therefore" — formal result [B2]
c-hence: "Hence" — formal result [C1]
c-thus: "Thus" — formal result [B2]
c-on-balance: "On balance" — weighing factors [C1]
c-to-some-extent: "To some extent" — hedging [B2]
c-it-is-evident-that: "It is evident that" — clear truth [B2]
c-arguably: "Arguably" — tentative claim [C1]
c-it-could-be-argued-that: "It could be argued that" — presenting a view [B2]
c-at-stake: "is at stake" — risk [C1]
c-underscore: "This underscores the need for" — emphasize importance [C1]
c-set-a-precedent: "set a precedent for" — establish a pattern [C1]
c-in-the-wake-of: "In the wake of" — after an event [C1]
c-a-double-edged-sword: "a double-edged sword" — pros and cons [B2]
c-tip-of-the-iceberg: "the tip of the iceberg" — small visible part [C1]
c-catch-22: "a catch-22 situation" — no-win scenario [C2]
c-far-reaching-implications: "far-reaching implications" — wide effects [C1]`;

export async function contrastiveAnalyze(studentText: string): Promise<ContrastiveAnalysis> {
  const system = `You are an ECLM writing analyst. Analyze student writing and return JSON with this exact structure:
{
  "constructionsUsed": [{"constructionId": "...", "text": "...", "quality": "correct"}],
  "gaps": [{"constructionId": "...", "studentText": "...", "targetForm": "...", "gapType": "suboptimal", "context": "...", "inZPD": true}],
  "overallLevel": "B1-B2",
  "suggestedFocus": ["..."]
}

Available constructions:
${CONSTRUCTION_LIST}

gapType: "missing" (should have used), "suboptimal" (used simpler alternative), or "upgrade_opportunity" (correct but could be more sophisticated).
inZPD: true if student seems ready to learn this (used related simpler form).
Only include meaningful gaps. Ignore minor issues. Focus on 2-5 most important gaps.`;

  const response = await callProxy(
    [{ role: 'system', content: system }, { role: 'user', content: `Student wrote:\n"""\n${studentText}\n"""\n\nAnalyze.` }],
    0.3,
  );

  try {
    const m = response.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as ContrastiveAnalysis;
  } catch { /* ignore */ }
  return { constructionsUsed: [], gaps: [], overallLevel: 'unknown', suggestedFocus: [] };
}

// ===== Construction Implantation =====

export async function implantFirstTurn(c: Construction): Promise<DialogueTurn> {
  const system = `You are introducing an academic construction. Target: "${c.form}" — ${c.meaning}.
First message: 1) explain when/why useful (1 sentence), 2) give ONE clear example, 3) ask student to try.
Keep to 2-3 sentences. Be warm. Student currently uses "${c.learnerDefault}" — mention as upgrade.`;

  const content = await callProxy([{ role: 'system', content: system }], 0.8);
  return { role: 'tutor', content, type: 'explanation', targetConstruction: c.id };
}

export async function implantTurn(
  c: Construction,
  studentMsg: string,
  history: DialogueTurn[],
  turn: number,
): Promise<DialogueTurn> {
  const system = `You are tutoring "${c.form}" (${c.meaning}). Principles:
1. NEVER give answer directly. Guide student to discover.
2. Use examples from different contexts.
3. After examples, ask student to try.
4. Success → celebrate + ask variation. Struggle → give hint.
5. Keep SHORT (2-3 sentences).
6. Turn ${turn}: Turn 1-2 = introduce + try; 3+ = variation or simplify.
Student often uses "${c.learnerDefault}" instead. Be encouraging.`;

  const msgs: Array<{ role: string; content: string }> = [{ role: 'system', content: system }];
  for (const h of history) msgs.push({ role: h.role === 'tutor' ? 'assistant' : 'user', content: h.content });
  msgs.push({ role: 'user', content: studentMsg });

  const content = await callProxy(msgs, 0.8);
  return { role: 'tutor', content, type: 'prompt', targetConstruction: c.id };
}
