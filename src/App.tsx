/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  LayoutDashboard, 
  Target, 
  Settings, 
  ChevronRight, 
  AlertCircle,
  Clock,
  Zap,
  Star,
  Trash2,
  X
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { Task } from './types';
import { cn } from './lib/utils';
import { prioritizeTasks } from './services/gemini';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'dashboard' | 'focus' | 'add'>('dashboard');
  const [loadingPriorities, setLoadingPriorities] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('focusnow_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load tasks", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('focusnow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks]
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.suggestedOrder - b.suggestedOrder);
  }, [tasks]);

  const activeTask = useMemo(() => {
    if (activeTaskId) return tasks.find(t => t.id === activeTaskId);
    return sortedTasks[0];
  }, [activeTaskId, sortedTasks, tasks]);

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'status' | 'suggestedOrder'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      suggestedOrder: tasks.length
    };
    setTasks(prev => [...prev, newTask]);
    setView('dashboard');
  };

  const updateTaskStatus = (id: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (activeTaskId === id && status !== 'pending') {
      setActiveTaskId(null);
    }
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handlePrioritize = async () => {
    setLoadingPriorities(true);
    const pending = tasks.filter(t => t.status === 'pending');
    if (pending.length > 0) {
      const orderedIds = await prioritizeTasks(pending);
      setTasks(prev => {
        return prev.map(t => {
          const index = orderedIds.indexOf(t.id);
          return {
            ...t,
            suggestedOrder: index === -1 ? 999 : index
          };
        });
      });
    }
    setLoadingPriorities(false);
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans selection:bg-black selection:text-white">
      {/* Dynamic Header */}
      <header className="max-w-7xl mx-auto px-10 pt-10 flex justify-between items-center transition-all">
        <div className="font-semibold tracking-[-0.5px] text-xl cursor-pointer" onClick={() => setView('dashboard')}>
          FOCUSNOW
        </div>
        <div className="text-sm font-medium text-app-muted uppercase tracking-wider">
          {format(new Date(), 'EEEE, d \'de\' MMMM')}
        </div>
      </header>

      {/* Navigation (Floating Minimal) */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white border border-app-border rounded-lg px-4 py-2 flex items-center gap-6 shadow-sm z-50">
        <button 
          onClick={() => setView('dashboard')}
          className={cn("p-2 transition-all hover:bg-black/5 rounded", view === 'dashboard' ? "text-black" : "text-app-muted")}
        >
          <LayoutDashboard size={20} />
        </button>
        <button 
          disabled={sortedTasks.length === 0}
          onClick={() => setView('focus')}
          className={cn("p-2 transition-all hover:bg-black/5 rounded disabled:opacity-30", view === 'focus' ? "text-black" : "text-app-muted")}
        >
          <Target size={20} />
        </button>
        <div className="w-[1px] h-4 bg-app-border" />
        <button 
          onClick={() => setView('add')}
          className={cn("p-2 transition-all hover:bg-black/5 rounded", view === 'add' ? "text-black" : "text-app-muted")}
        >
          <Plus size={20} />
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-10 pt-20 pb-40">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.section
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16"
            >
              <div className="flex justify-between items-end border-b border-app-border pb-8">
                <div>
                  <h1 className="text-xs font-bold uppercase tracking-[2px] text-app-muted mb-2">Resumen Diario</h1>
                  <p className="text-app-muted text-sm">Organiza tu enfoque hoy.</p>
                </div>
                <button 
                  onClick={handlePrioritize}
                  disabled={loadingPriorities || sortedTasks.length < 2}
                  className="px-6 py-3 bg-black text-white rounded-[4px] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-10"
                >
                  {loadingPriorities ? "Analizando..." : "Optimizar Itinerario"}
                </button>
              </div>

              <div className="space-y-12">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-app-muted mb-4 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-app-accent rounded-full" /> Tareas Pendientes
                  </h2>
                  <div className="space-y-[1px] bg-app-border border border-app-border rounded-[4px] overflow-hidden">
                    {sortedTasks.length > 0 ? (
                      sortedTasks.map((task, index) => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          index={index} 
                          onComplete={() => updateTaskStatus(task.id, 'completed')}
                          onDelete={() => deleteTask(task.id)}
                          onFocus={() => {
                            setActiveTaskId(task.id);
                            setView('focus');
                          }}
                        />
                      ))
                    ) : (
                      <div className="py-24 text-center bg-white flex flex-col items-center gap-2">
                        <Clock className="text-app-border" size={32} />
                        <p className="text-app-muted text-sm tracking-wide">Tu itinerario está limpio.</p>
                      </div>
                    )}
                  </div>
                </div>

                {tasks.filter(t => t.status === 'completed').length > 0 && (
                  <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-app-muted mb-4">Completadas hoy</h2>
                    <div className="space-y-[1px] border-t border-app-border">
                      {tasks.filter(t => t.status === 'completed').map(task => (
                        <div key={task.id} className="py-4 flex items-center justify-between group border-b border-app-border/50">
                          <div className="flex items-center gap-3 text-app-muted">
                            <CheckCircle2 size={16} />
                            <span className="line-through text-sm font-light">{task.title}</span>
                          </div>
                          <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-app-muted hover:text-black">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {view === 'focus' && (
            <motion.section
              key="focus"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-app-bg z-40 flex flex-col p-[60px]"
            >
              <header className="flex justify-between items-center mb-20">
                <div className="font-semibold tracking-[-0.5px] text-xl uppercase">FocusFlow</div>
                <div className="text-sm text-app-muted uppercase tracking-wider">
                  {format(new Date(), 'EEEE, d \'de\' MMMM')}
                </div>
              </header>

              {activeTask ? (
                <div className="flex-1 flex flex-col justify-center max-w-[700px] mx-auto w-full">
                  <div className="text-[12px] uppercase tracking-[2px] text-[#A0A0A0] mb-[24px] flex items-center before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-app-accent before:rounded-full before:mr-3">
                    Enfoque Actual
                  </div>
                  
                  <h2 className="text-[48px] font-medium leading-[1.1] mb-[40px] tracking-tight">
                    {activeTask.title}
                  </h2>
                  
                  {activeTask.description && (
                    <p className="text-lg text-app-muted mb-[40px] font-normal leading-relaxed opacity-70">
                      {activeTask.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-5 mb-[60px]">
                    <MetaItem label="Urgencia" value={activeTask.urgency === 5 ? "Crítica" : activeTask.urgency >= 4 ? "Alta" : activeTask.urgency >= 2 ? "Media" : "Baja"} />
                    <MetaItem label="Importancia" value={activeTask.importance >= 4 ? "Alta" : activeTask.importance >= 2 ? "Media" : "Baja"} />
                    <MetaItem 
                      label="Tiempo aprox." 
                      value={activeTask.effort === 'low' ? "< 1 hora" : activeTask.effort === 'medium' ? "1-3 horas" : "> 3 horas"} 
                    />
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => updateTaskStatus(activeTask.id, 'completed')}
                      className="bg-black text-white px-9 py-[18px] rounded-[4px] text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
                    >
                      Marcar como Completada
                    </button>
                    <button 
                      onClick={() => setView('dashboard')}
                      className="bg-transparent border border-app-border text-[#666] px-6 py-[18px] rounded-[4px] text-sm font-medium hover:bg-black/5 transition-all"
                    >
                      Posponer / Salir
                    </button>
                  </div>

                  {sortedTasks.length > 1 && (
                    <div className="fixed right-14 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] text-[#D1D1D1] text-[12px] uppercase tracking-[2px] opacity-50 flex items-center gap-4">
                      <span>Próxima tarea: {sortedTasks[1].title}</span>
                      <ChevronRight size={14} className="rotate-90" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="text-[12px] uppercase tracking-[2px] text-app-muted mb-4">Todo al día</div>
                  <h2 className="text-4xl font-medium mb-8">Itinerario Completado</h2>
                  <button 
                    onClick={() => setView('dashboard')}
                    className="bg-black text-white px-9 py-[18px] rounded-[4px] text-sm font-medium"
                  >
                    Volver al Dashboard
                  </button>
                </div>
              )}

              <div className="mt-auto pt-20">
                <div className="flex justify-between text-[12px] text-app-muted mb-3 uppercase tracking-wider">
                  <span>Tu itinerario de hoy</span>
                  <span>{tasks.filter(t => t.status === 'completed').length} de {tasks.length} tareas completadas</span>
                </div>
                <div className="h-[2px] bg-[#EAEAEA] w-full relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(tasks.filter(t => t.status === 'completed').length / (tasks.length || 1)) * 100}%` }}
                    className="h-full bg-black transition-all duration-700"
                  />
                </div>
              </div>
            </motion.section>
          )}

          {view === 'add' && (
            <motion.section
              key="add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white p-12 rounded-[4px] border border-app-border shadow-sm">
                <header className="mb-12">
                  <div className="text-[11px] font-bold uppercase tracking-[2px] text-app-muted mb-2">Creación</div>
                  <h2 className="text-3xl font-medium tracking-tight">Nueva Tarea</h2>
                </header>
                <AddTaskForm onSubmit={handleAddTask} onCancel={() => setView('dashboard')} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  index: number;
  onComplete: () => void;
  onDelete: () => void;
  onFocus: () => void;
  key?: React.Key;
}

function TaskCard({ task, index, onComplete, onDelete, onFocus }: TaskCardProps) {
  return (
    <div 
      className="group bg-white p-6 hover:bg-[#FAFBFB] transition-all flex items-center gap-6 cursor-pointer relative"
      onClick={onFocus}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="text-app-border hover:text-black transition-colors"
      >
        <Circle size={20} strokeWidth={1.5} />
      </button>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-lg leading-snug tracking-tight mb-2">{task.title}</h3>
        <div className="flex items-center gap-5 text-[10px] text-app-muted uppercase tracking-wider font-semibold">
          <span className="flex items-center gap-1.5"><Clock size={10} /> {format(parseISO(task.dueDate), 'MMM d')}</span>
          <span className="w-1 h-1 bg-app-border rounded-full" />
          <span>Esfuerzo: {task.effort === 'low' ? 'Bajo' : task.effort === 'medium' ? 'Medio' : 'Alto'}</span>
          <span className="w-1 h-1 bg-app-border rounded-full" />
          <span>Urgencia: {task.urgency}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-app-muted hover:text-red-600 transition-colors"
        >
          <Trash2 size={16} />
        </button>
        <ChevronRight size={18} className="text-app-border" />
      </div>
    </div>
  );
}

function AddTaskForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [urgency, setUrgency] = useState(3);
  const [importance, setImportance] = useState(3);
  const [effort, setEffort] = useState<Task['effort']>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onSubmit({
      title,
      description,
      dueDate,
      urgency,
      importance,
      effort
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[2px] text-app-muted">¿Qué quieres lograr?</label>
        <input 
          autoFocus
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)}
          className="w-full text-xl font-normal bg-transparent border-b border-app-border py-3 focus:outline-none focus:border-black transition-all placeholder:text-app-border"
          placeholder="Escribe el título de la tarea..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[2px] text-app-muted">Contexto adicional</label>
        <textarea 
          value={description} 
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-transparent border border-app-border rounded-[4px] p-4 min-h-[120px] focus:outline-none focus:border-black transition-all text-sm"
          placeholder="Detalles, sub-tareas, enlaces..."
        />
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-[2px] text-app-muted">Fecha Límite</label>
          <input 
            type="date" 
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full bg-transparent border-b border-app-border py-2 focus:outline-none focus:border-black text-sm"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-[2px] text-app-muted">
            Nivel de Esfuerzo
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEffort(level)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded border transition-all",
                  effort === level 
                    ? "bg-black text-white border-black" 
                    : "bg-transparent border-app-border text-app-muted hover:border-black hover:text-black"
                )}
              >
                {level === 'low' ? '< 1h' : level === 'medium' ? '1-3h' : '> 3h'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-[2px] text-app-muted flex justify-between">
            <span>Urgencia (1-5)</span>
            <span className="text-black">{urgency}</span>
          </label>
          <input 
            type="range" min="1" max="5" 
            value={urgency} 
            onChange={e => setUrgency(Number(e.target.value))}
            className="w-full h-1 bg-app-border rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-[2px] text-app-muted flex justify-between">
            <span>Importancia (1-5)</span>
            <span className="text-black">{importance}</span>
          </label>
          <input 
            type="range" min="1" max="5" 
            value={importance} 
            onChange={e => setImportance(Number(e.target.value))}
            className="w-full h-1 bg-app-border rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button 
          type="submit"
          className="flex-1 bg-black text-white py-4 rounded-[4px] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all border border-black"
        >
          Guardar Tarea
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="px-8 py-4 bg-transparent border border-app-border rounded-[4px] text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-all text-app-muted"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}

function FocusStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-black/40">
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-widest font-bold text-black/20">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(step => (
          <div 
            key={step} 
            className={cn("w-2 h-2 rounded-full", step <= value ? "bg-orange-500" : "bg-black/5")} 
          />
        ))}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-app-border p-5 rounded-[4px]">
      <div className="text-[10px] uppercase tracking-[2px] text-app-muted mb-2">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
