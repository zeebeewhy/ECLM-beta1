import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { constructions, categories, constructionMap } from '@/data/constructions';
import { useStudentStore } from '@/store/student';

export default function ProgressPage() {
  const navigate = useNavigate();
  const store = useStudentStore();
  const mastered = constructions.filter(c => (store.mastery[c.id]?.beta ?? 0) > 0.6).length;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Construction Network</h2>
        <div className="flex items-center gap-4 text-sm">
          <span>{mastered}/{constructions.length} constructions</span>
          <Progress value={(mastered / constructions.length) * 100} className="h-2 flex-1" />
          <span>{Math.round((mastered / constructions.length) * 100)}%</span>
        </div>
      </div>

      {Object.entries(categories).map(([catName, ids]) => (
        <Card key={catName}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{catName}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ids.map(id => {
              const c = constructionMap.get(id); if (!c) return null;
              const m = store.mastery[id];
              const beta = m?.beta ?? 0;
              return (
                <div key={id} className="flex items-center justify-between text-sm group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2" onClick={() => navigate(`/implant/${id}`)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={beta > 0.6 ? 'text-green-700 font-medium' : beta > 0 ? 'text-amber-700' : ''}>{c.form}</span>
                      {beta > 0.6 && <Badge variant="outline" className="text-xs text-green-600">mastered</Badge>}
                      {beta > 0 && beta <= 0.6 && <Badge variant="outline" className="text-xs text-amber-600">learning</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2">Practice</Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
