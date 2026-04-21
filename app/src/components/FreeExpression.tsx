import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ChevronRight, BookOpen } from 'lucide-react';
import { contrastiveAnalyze } from '@/engine/llm';
import { constructionMap } from '@/data/constructions';
import { useStudentStore } from '@/store/student';
import type { ContrastiveAnalysis } from '@/types';

export default function FreeExpression() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<ContrastiveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const store = useStudentStore();

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().split(/\s+/).length < 5) return;
    setLoading(true); setError(''); setAnalysis(null);
    try {
      const result = await contrastiveAnalyze(text);
      setAnalysis(result);
      // Record encounters for used constructions
      for (const u of result.constructionsUsed) {
        store.recordEncounter({
          timestamp: Date.now(), constructionId: u.constructionId,
          type: 'dialogical', contextId: 'free-expression', mode: 'explicit',
          result: u.quality === 'correct' ? 'produced' : 'prompted',
          deltaAlpha: 0.05, deltaBeta: u.quality === 'correct' ? 0.1 : 0.02,
        });
      }
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5" /> Free Expression</h2>
      <p className="text-sm text-muted-foreground">Write about anything in English. We will analyze which academic constructions you used and which you could upgrade.</p>

      {!analysis ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your thoughts here... (at least 5 words)" className="min-h-[200px]" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{text.trim().split(/\s+/).filter(Boolean).length} words</span>
              <Button onClick={handleAnalyze} disabled={text.trim().split(/\s+/).filter(Boolean).length < 5 || loading}>
                <Sparkles className="w-4 h-4 mr-2" />{loading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-muted/50"><CardContent className="p-4"><p className="text-sm whitespace-pre-wrap">{text}</p></CardContent></Card>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">Level: {analysis.overallLevel}</Badge>
            <Badge variant="outline">{analysis.constructionsUsed.length} used</Badge>
            <Badge>{analysis.gaps.length} opportunities</Badge>
          </div>

          {analysis.constructionsUsed.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-green-700">Constructions Used</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {analysis.constructionsUsed.map((u, i) => {
                  const c = constructionMap.get(u.constructionId);
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">&#10003;</span>
                      <span className="font-medium">{c?.form || u.constructionId}</span>
                      <span className="text-muted-foreground">— "{u.text}"</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {analysis.gaps.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base text-amber-700">Upgrade Opportunities</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analysis.gaps.map((gap, i) => {
                  const c = constructionMap.get(gap.constructionId);
                  return (
                    <div key={i} className="border rounded-md p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">{c?.form || gap.targetForm}</span>
                        <div className="flex gap-1">
                          {gap.inZPD && <Badge className="text-xs">ZPD</Badge>}
                          <Badge variant="outline" className="text-xs">{gap.gapType}</Badge>
                        </div>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">You:</span> <span className="line-through text-red-600">{gap.studentText}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Upgrade:</span> <span className="text-green-700 font-medium">{gap.targetForm}</span></p>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/implant/${gap.constructionId}`)} className="w-full"><ChevronRight className="w-3 h-3 mr-1" />Learn This</Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => { setAnalysis(null); setText(''); }} className="w-full">Write Something New</Button>
        </div>
      )}
    </div>
  );
}
