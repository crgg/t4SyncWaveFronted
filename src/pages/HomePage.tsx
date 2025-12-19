/**
 * Página principal - Selección de crear o unirse a sesión
 */

// import { useState } from 'react';
import { motion } from 'framer-motion';

// import { CreateSessionForm } from '@features/session/components/CreateSessionForm';
// import { JoinSessionForm } from '@features/session/components/JoinSessionForm';
// import { ConnectionStatus } from '@shared/components/ConnectionStatus/ConnectionStatus';
import { withAuth } from '@shared/hoc/withAuth';

export function HomePage() {
  // const [mode, setMode] = useState<'create' | 'join'>('create');

  return (
    <div className="w-full max-w-2xl">
      {/* Banner Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 rounded-lg overflow-hidden shadow-2xl"
      >
        <div className="relative h-48 sm:h-64 bg-gradient-to-r from-primary-600 to-primary-400 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 text-center text-white">
            <svg
              className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 opacity-90"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <h2 className="text-2xl sm:text-3xl font-bold">Sync your music</h2>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-light-text dark:text-dark-text mb-2 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
          T4SyncWave
        </h1>
        {/* <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Sync your music in real time
        </p> */}
      </motion.div>

      {/* Connection Status */}
      {/* <div className="mb-6 flex justify-center">
        <ConnectionStatus />
      </div> */}

      {/* Tabs */}
      {/* <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-1 mb-6 flex gap-1">
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'create'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-hover dark:hover:bg-dark-hover'
          }`}
        >
          Create Session
        </button>
        <button
          onClick={() => setMode('join')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'join'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-hover dark:hover:bg-dark-hover'
          }`}
        >
          Join Session
        </button>
      </div> */}

      {/* Form */}
      {/* <motion.div
        key={mode}
        initial={{ opacity: 0, x: mode === 'create' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {mode === 'create' ? <CreateSessionForm /> : <JoinSessionForm />}
      </motion.div> */}
    </div>
  );
}

export default withAuth(HomePage);
