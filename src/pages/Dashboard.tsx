import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Trainer, Client, Template } from '../types';
import Layout from '../components/Layout';
import ScheduleTab from '../components/schedule/ScheduleTab';
import ClientsTab from '../components/clients/ClientsTab';
import SessionsTab from '../components/sessions/SessionsTab';
import PaymentsTab from '../components/payments/PaymentsTab';
import TrainersTab from '../components/trainers/TrainersTab';

type Tab = 'schedule' | 'clients' | 'sessions' | 'payments' | 'trainers';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentTrainer, setCurrentTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [initializing, setInitializing] = useState(true);

  function logout() {
    localStorage.removeItem('trainer_jwt');
    localStorage.removeItem('trainer_info');
    navigate('/login', { replace: true });
  }

  const loadClients = useCallback(async () => {
    const data = await api.get<Client[]>('/api/clients');
    setClients(Array.isArray(data) ? data : []);
  }, []);

  const loadTrainers = useCallback(async () => {
    const data = await api.get<Trainer[]>('/api/trainers');
    setTrainers(Array.isArray(data) ? data : []);
  }, []);

  const loadTemplates = useCallback(async () => {
    const data = await api.get<Template[]>('/api/templates');
    setTemplates(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const trainer = await api.get<Trainer & { error?: string }>('/api/auth/me');
        if (!trainer || trainer.error) {
          logout();
          return;
        }
        setCurrentTrainer(trainer);

        const promises: Promise<void>[] = [loadClients(), loadTemplates()];
        if (trainer.role === 'admin') promises.push(loadTrainers());
        await Promise.all(promises);
      } finally {
        setInitializing(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (initializing || !currentTrainer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-[3px] border-primary border-t-transparent mx-auto mb-4 animate-spin"
          />
          <p className="text-text2 text-sm font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      trainer={currentTrainer}
      onLogout={() => {
        if (confirm('Выйти из системы?')) logout();
      }}
    >
      {activeTab === 'schedule' && (
        <ScheduleTab clients={clients} />
      )}
      {activeTab === 'clients' && (
        <ClientsTab
          clients={clients}
          onReload={loadClients}
          currentTrainer={currentTrainer}
          trainers={trainers}
        />
      )}
      {activeTab === 'sessions' && (
        <SessionsTab
          clients={clients}
          templates={templates}
          onTemplatesChange={setTemplates}
        />
      )}
      {activeTab === 'payments' && (
        <PaymentsTab clients={clients} />
      )}
      {activeTab === 'trainers' && currentTrainer.role === 'admin' && (
        <TrainersTab currentTrainer={currentTrainer} />
      )}
    </Layout>
  );
}
