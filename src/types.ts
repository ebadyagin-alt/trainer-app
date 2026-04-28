export interface Trainer {
  id: number;
  name: string;
  email: string;
  role: 'trainer' | 'admin';
  created_at?: string;
}

export interface Client {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  goals?: string;
  notes?: string;
  trainer_id?: number | null;
  invite_token?: string;
  created_at?: string;
}

export interface Appointment {
  id: number;
  client_id: number;
  client_name: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'pending' | 'done' | 'cancelled';
  notes?: string;
}

export interface Exercise {
  name: string;
  sets?: string | number;
  reps?: string | number;
  weight?: string | number;
  rir?: string | number;
  rpe?: string | number;
  rest_sec?: string | number;
}

export interface Session {
  id: number;
  client_id: number;
  client_name: string;
  date: string;
  exercises: Exercise[] | string;
  notes?: string;
}

export interface Payment {
  id: number;
  client_id: number;
  client_name: string;
  amount: number;
  date: string;
  description?: string;
  paid: boolean;
}

export interface PaymentSummary {
  monthTotal: number;
  debt: number;
}

export interface Template {
  id: number;
  name: string;
  exercises: Exercise[] | string;
  trainer_id?: number;
}

export interface PortalData {
  client: Client;
  appointments: Appointment[];
  sessions: Session[];
  payments: Payment[];
}
