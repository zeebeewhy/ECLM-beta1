export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Construction {
  id: string;
  form: string;
  forms: string[];
  meaning: string;
  level: 'micro' | 'meso' | 'macro';
  cefr: CEFRLevel;
  domain: string[];
  register: 'formal' | 'academic' | 'neutral' | 'informal';
  isFormulaic: boolean;
  parents: string[];
  children: string[];
  peers: { id: string; relation: 'compete' | 'collocate' | 'intensify' }[];
  learnerDefault: string;
}

export interface Mastery3D {
  alpha: number;
  beta: number;
  gamma: number;
  lastEncounter: number;
  encounterCount: number;
  contextsUsed: string[];
}

export interface AffectiveState {
  engagement: number;
  confusion: number;
  frustration: number;
  boredom: number;
  dominant: 'flow' | 'learning' | 'confused' | 'frustrated' | 'bored' | 'disengaged';
}

export interface EncounterRecord {
  timestamp: number;
  constructionId: string;
  type: 'input' | 'elicit' | 'dialogical' | 'varied';
  contextId: string;
  mode: 'explicit' | 'implicit';
  result: 'recognized' | 'produced' | 'failed' | 'prompted';
  deltaAlpha: number;
  deltaBeta: number;
}

export interface ContrastiveAnalysis {
  constructionsUsed: Array<{
    constructionId: string;
    text: string;
    quality: 'correct' | 'partial' | 'awkward';
  }>;
  gaps: Array<{
    constructionId: string;
    studentText: string;
    targetForm: string;
    gapType: 'missing' | 'suboptimal' | 'upgrade_opportunity';
    context: string;
    inZPD: boolean;
  }>;
  overallLevel: string;
  suggestedFocus: string[];
}

export interface DialogueTurn {
  role: 'tutor' | 'student';
  content: string;
  type?: 'explanation' | 'example' | 'prompt' | 'feedback' | 'celebration';
  targetConstruction?: string;
}
