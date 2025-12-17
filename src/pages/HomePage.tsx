/**
 * Página principal - Selección de crear o unirse a sesión
 */

import { useState } from 'react';
import { CreateSessionForm } from '@features/session/components/CreateSessionForm';
import { JoinSessionForm } from '@features/session/components/JoinSessionForm';
import { ConnectionStatus } from '@shared/components/ConnectionStatus/ConnectionStatus';
import { motion } from 'framer-motion';

export function HomePage() {
  const [mode, setMode] = useState<'create' | 'join'>('create');

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-dark-text mb-2 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            T4SyncWave
          </h1>
          <p className="text-dark-text-secondary">Sincroniza tu música en tiempo real</p>
        </motion.div>

        {/* Connection Status */}
        <div className="mb-6 flex justify-center">
          <ConnectionStatus />
        </div>

        {/* Tabs */}
        <div className="bg-dark-card rounded-xl shadow-2xl p-1 mb-6 flex gap-1">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'create'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'text-dark-text-secondary hover:bg-dark-hover'
            }`}
          >
            Crear Sesión
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              mode === 'join'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'text-dark-text-secondary hover:bg-dark-hover'
            }`}
          >
            Unirse a Sesión
          </button>
        </div>

        {/* Form */}
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === 'create' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {mode === 'create' ? <CreateSessionForm /> : <JoinSessionForm />}
        </motion.div>
      </div>
    </div>
  );
}
