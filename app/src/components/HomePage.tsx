import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PenLine, MessageSquare, Network } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">ECLM Learn</h1>
        <p className="text-muted-foreground">Emergent Construction Learning Model</p>
        <p className="text-sm text-muted-foreground">Usage-Based language acquisition through construction awareness</p>
      </div>

      <div className="grid gap-4">
        <Link to="/free">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><PenLine className="w-5 h-5 text-primary" /></div>
              <div className="space-y-1">
                <h3 className="font-semibold">Free Expression</h3>
                <p className="text-sm text-muted-foreground">Write freely about any topic. We analyze your construction usage and find upgrade opportunities.</p>
                <Badge variant="outline">Discover gaps</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/progress">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Network className="w-5 h-5 text-primary" /></div>
              <div className="space-y-1">
                <h3 className="font-semibold">Construction Network</h3>
                <p className="text-sm text-muted-foreground">Explore 50 academic constructions. See which ones you have mastered and which need work.</p>
                <Badge variant="outline">Track progress</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-lg mx-auto space-y-1">
        <p>ECLM treats language as a network of <strong>constructions</strong> — prefabricated form-meaning pairings.</p>
        <p>Instead of memorizing rules, you acquire constructions through <strong>varied-context encounters</strong>.</p>
      </div>
    </div>
  );
}
