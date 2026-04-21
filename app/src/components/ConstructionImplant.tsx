import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { implantFirstTurn, implantTurn } from '@/engine/llm';
import { constructionMap } from '@/data/constructions';
import { useStudentStore } from '@/store/student';
import type { DialogueTurn } from '@/types';

export default function ConstructionImplant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const c = id ? constructionMap.get(id) : undefined;
  const store = useStudentStore();
  const [history, setHistory] = useState<DialogueTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  if (!c) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <p className="text-muted-foreground mt-4">Construction not found.</p>
      </div>
    );
  }

  const start = async () => {
    setLoading(true); setError('');
    try {
      const turn = await implantFirstTurn(c);
      setHistory([turn]); setStarted(true);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const studentTurn: DialogueTurn = { role: 'student', content: input };
    const newHistory = [...history, studentTurn];
    setHistory(newHistory); setInput(''); setLoading(true); setError('');
    try {
      const tutorCount = newHistory.filter(t => t.role === 'tutor').length;
      const turn = await implantTurn(c, input, newHistory, tutorCount + 1);
      setHistory([...newHistory, turn]);
      // Record production attempt
      store.recordEncounter({
        timestamp: Date.now(), constructionId: c.id,
        type: 'dialogical', contextId: `implant-${c.id}`, mode: 'explicit',
        result: 'produced', deltaAlpha: 0.02, deltaBeta: 0.08,
      });
    } catch (e) {
      setHistory(newHistory);
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/progress')}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h2 className="text-lg font-semibold">{c.form}</h2>
          <p className="text-xs text-muted-foreground">{c.meaning}</p>
        </div>
        <Badge variant="outline" className="ml-auto">{c.cefr}</Badge>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0" />{error}
        </div>
      )}

      {!started ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{c.meaning}</p>
              <p className="text-sm">Level: {c.cefr} | Register: {c.register}</p>
              {c.learnerDefault && <p className="text-sm text-amber-700">You probably use: &quot;{c.learnerDefault}&quot;</p>}
            </div>
            <Button onClick={start} disabled={loading} className="w-full">{loading ? 'Starting...' : 'Start Dialogue'}</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="max-h-[55vh] overflow-y-auto">
            <CardContent className="p-4 space-y-3">
              {history.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${t.role === 'student' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="whitespace-pre-wrap">{t.content}</p>
                  </div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">Thinking...</div></div>}
              <div ref={scrollRef} />
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your response..." className="min-h-[60px] resize-none" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <Button onClick={send} disabled={loading || !input.trim()} className="shrink-0"><Send className="w-4 h-4" /></Button>
          </div>
        </>
      )}
    </div>
  );
}
