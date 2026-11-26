export type Subject = '국어' | '수학' | '사회' | '과학';
export type SubjectFilter = Subject | '전체';
export type DifficultyLevel = 1 | 2 | 3;
export type PracticeMode = 'IDLE' | 'SHORT' | 'LONG' | 'ACID_RAIN' | 'RACING';
export type AppTab = 'HOME' | 'SHORT' | 'LONG' | 'ACID_RAIN' | 'RACING' | 'TEACHER';

export interface ShortSentence {
  id: string;
  subject: Subject;
  level: DifficultyLevel;
  text: string;
  keyWord: string;
}

export interface LongPassage {
  id: string;
  subject: Subject;
  unitTitle: string;
  achievementStandard: string;
  difficulty: '기초' | '표준' | '심화';
  sentences: string[];
  keywords: string[];
  isCustom?: boolean;
}

export interface WordPoolItem {
  word: string;
  subject: Subject;
  unitTitle: string;
  fromLongBoard: boolean;
}

export interface SubjectStats {
  sessions: number;
  avgCpm: number;
  avgAccuracy: number;
  completedPassageIds: string[];
  masteredWords: string[];
}

export interface LiveActivity {
  mode: PracticeMode;
  subject: SubjectFilter;
  liveCpm: number;
  liveAccuracy: number;
  updatedAt: number;
}

export interface StudentProfile {
  id: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
  totalSessions: number;
  avgCpm: number;
  bestCpm: number;
  avgAccuracy: number;
  shortCompleted: number;
  longCompleted: number;
  gamesPlayed: number;
  bestAcidScore: number;
  raceWins: number;
  subjectProgress: Record<Subject, SubjectStats>;
  currentActivity: LiveActivity;
  lastActiveAt: string;
}

export interface PracticeSession {
  id: string;
  studentId: string;
  studentName: string;
  mode: Exclude<PracticeMode, 'IDLE'>;
  subject: SubjectFilter;
  itemTitle: string;
  cpm: number;
  maxCpm: number;
  accuracy: number;
  durationSec: number;
  score: number;
  wordsLearned: string[];
  createdAt: string;
}

export interface RacerState {
  id: string;
  name: string;
  isBot: boolean;
  progressPct: number;
  cpm: number;
  accuracy: number;
  wordsCleared: number;
  finished: boolean;
  finishRank: number | null;
  colorIndex: number;
}

export interface RaceRoom {
  roomId: string;
  roomName: string;
  hostId: string;
  hostName: string;
  subject: SubjectFilter;
  status: 'WAITING' | 'COUNTDOWN' | 'RACING' | 'FINISHED';
  countdown: number;
  withBots: boolean;
  prompts: string[];
  racers: RacerState[];
  createdAt: number;
}

export interface BootstrapPayload {
  students: StudentProfile[];
  sessions: PracticeSession[];
  customPassages: LongPassage[];
}
