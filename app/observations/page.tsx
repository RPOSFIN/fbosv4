"use client";

import { useState, useEffect } from 'react';
import { Eye, Plus, Edit, Trash2 } from 'lucide-react';

interface Observation {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export default function ObservationPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
  });

  useEffect(() => {
    loadObservations();
  }, []);

  async function loadObservations() {
    try {
      const res = await fetch('/api/observation');
      if (res.ok) {
        const data = await res.json();
        setObservations(data.observations || []);
      }
    } catch (err) {
      console.error('Failed to load observations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ title: '', description: '', status: 'open', priority: 'medium' });
        loadObservations();
      }
    } catch (err) {
      console.error('Failed to create observation:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this observation?')) return;
    try {
      await fetch(`/api/observation?id=${id}`, { method: 'DELETE' });
      loadObservations();
    } catch (err) {
      console.error('Failed to delete observation:', err);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'in_progress': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'closed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Observations</h1>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-7 h-7" />
            Observations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and manage observations
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Observation
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Observations List */}
      {observations.length === 0 ? (
        <div className="p-8 border border-slate-700 rounded-lg bg-slate-900/50 text-center text-slate-400">
          No observations yet. Click "New Observation" to add one.
        </div>
      ) : (
        <div className="grid gap-4">
          {observations.map((obs) => (
            <div key={obs.id} className="p-4 border border-slate-700 rounded-lg bg-slate-900/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{obs.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">{obs.description}</p>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs border ${statusColor(obs.status)}`}>
                      {obs.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs border ${priorityColor(obs.priority)}`}>
                      {obs.priority}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(obs.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(obs.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
