// ============================================================================
// Shared Type Definitions for Now + Record Pages
// ============================================================================

export interface TodayData {
  date: string;

  medications: {
    taken: number;
    total: number;
    items: Array<{
      id: string;
      name: string;
      time: string;
      taken: boolean;
      takenAt?: string;
    }>;
  };

  vitals: {
    logged: number;
    total: number;
    bp?: { systolic: number; diastolic: number; time: string };
    heartRate?: { value: number; time: string };
    temperature?: { value: number; time: string };
    oxygen?: { value: number; time: string };
  };

  mood: {
    logged: boolean;
    value?: number;
    energy?: number;
    time?: string;
  };

  meals: {
    logged: number;
    total: number;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };

  water: {
    glasses: number;
  };

  sleep: {
    logged: boolean;
    hours?: number;
    quality?: number;
  };

  symptoms: {
    logged: boolean;
    items: Array<{
      symptom: string;
      severity: number;
      time: string;
    }>;
  };

  notes: {
    count: number;
    items: Array<{
      text: string;
      time: string;
    }>;
  };
}

export interface StatusResult {
  completed: number;
  total: number;
  percent: number;
  status: 'complete' | 'partial' | 'empty';
  statusText?: {
    text: string;
    done: boolean;
  };
}
