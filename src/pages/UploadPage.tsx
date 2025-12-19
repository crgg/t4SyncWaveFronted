import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

import { uploadService } from '@services/upload';
import { withAuth } from '@shared/hoc/withAuth';

const ACCEPTED_AUDIO_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/flac': ['.flac'],
};

function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadedFile(null);

    try {
      const response = await uploadService.uploadAudio(file);
      setUploadedFile({
        name: response.title,
        url: response.url,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading the file');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_AUDIO_TYPES,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text mb-2">
            Upload Music
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Drag and drop your audio file or click to select
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-light-card dark:bg-dark-card rounded-2xl shadow-xl p-6 sm:p-8"
        >
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
              ${
                isDragActive
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-light-hover dark:border-dark-hover hover:border-primary-600 dark:hover:border-primary-600'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 text-primary-600">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              {isUploading ? (
                <div>
                  <p className="text-lg font-medium text-light-text dark:text-dark-text">
                    Uploading file...
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
                    Please wait
                  </p>
                </div>
              ) : isDragActive ? (
                <div>
                  <p className="text-lg font-medium text-primary-600">Drop the file here</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-light-text dark:text-dark-text">
                    Drag and drop your audio file or click to select
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
                    or click to select
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-4">
                    Supported formats: MP3, WAV, OGG, M4A, FLAC
                  </p>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {uploadedFile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg"
              >
                <p className="text-green-700 dark:text-green-400 font-medium mb-2">
                  File uploaded successfully!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">{uploadedFile.name}</p>
                <a
                  href={uploadedFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 underline mt-2 inline-block"
                >
                  View file
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default withAuth(UploadPage);
