import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getConfig, setConfig, PRESETS, testConnection } from '@/engine/llm';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Props { onConfigured: () => void; }
type PKey = 'openai' | 'kimi' | 'azure' | 'custom';

export default function SettingsPage({ onConfigured }: Props) {
  const cur = getConfig();
  const [preset, setPreset] = useState<PKey>('openai');
  const [key, setKey] = useState(cur.apiKey);
  const [url, setUrl] = useState(cur.baseUrl);
  const [model, setModel] = useState(cur.model);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const applyPreset = (k: PKey) => {
    setPreset(k);
    if (k !== 'custom') { const p = PRESETS[k]; setUrl(p.baseUrl); setModel(p.model); }
    setResult(null);
  };

  const handleSave = () => {
    if (!key.trim()) return;
    setConfig({ apiKey: key.trim(), baseUrl: url.trim(), model: model.trim() });
    onConfigured();
  };

  const handleTest = async () => {
    if (!key.trim()) return;
    setConfig({ apiKey: key.trim(), baseUrl: url.trim(), model: model.trim() });
    setTesting(true); setResult(null);
    try { const r = await testConnection(); setResult({ ok: true, msg: `Connected: "${r}"` }); }
    catch (e) { setResult({ ok: false, msg: (e as Error).message }); }
    setTesting(false);
  };

  return (
    <div className="max-w-lg mx-auto p-6 pt-10 space-y-6">
      <Card>
        <CardHeader><CardTitle>API Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your settings are stored locally only. API key is sent via your own proxy.</p>

          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(PRESETS) as [PKey, typeof PRESETS[PKey]][]).map(([k, p]) => (
              <Button key={k} variant={preset === k ? 'default' : 'outline'} size="sm" onClick={() => applyPreset(k)}>{p.label}</Button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">API Key</label>
            <Input value={key} onChange={(e) => { setKey(e.target.value); setResult(null); }} placeholder="sk-..." type="password" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Base URL</label>
            <Input value={url} onChange={(e) => { setUrl(e.target.value); setPreset('custom'); setResult(null); }} placeholder="https://..." disabled={preset !== 'custom' && preset !== 'kimi'} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Model</label>
            <Input value={model} onChange={(e) => { setModel(e.target.value); setPreset('custom'); setResult(null); }} placeholder="model" disabled={preset !== 'custom' && preset !== 'kimi'} />
          </div>

          {preset === 'kimi' && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">If 401: try Custom with https://api.moonshot.ai/v1 (international) or https://api.moonshot.cn/v1 (mainland)</p>
          )}

          {result && (
            <div className={`flex gap-2 p-3 rounded text-sm ${result.ok ? 'bg-green-50 text-green-700 border' : 'bg-red-50 text-red-700 border'}`}>
              {result.ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <div className="whitespace-pre-wrap">{result.msg}</div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={!key.trim() || testing} className="flex-1">{testing ? 'Testing...' : 'Test'}</Button>
            <Button onClick={handleSave} disabled={!key.trim()} className="flex-1">Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Deploy Your Own Proxy</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The <code>/api/chat.ts</code> Edge Function in this repo is your proxy.</p>
          <p>Push this code to GitHub, then deploy to Vercel. The proxy handles CORS and forwards requests to any OpenAI-compatible API.</p>
          <p className="text-xs">Proxy never stores API keys. Keys travel via headers from browser → your proxy → target API.</p>
        </CardContent>
      </Card>
    </div>
  );
}
