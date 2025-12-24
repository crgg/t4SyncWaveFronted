import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { uploadService } from '@services/upload';
import { Modal } from '@shared/components/Modal/Modal';
import { Button } from '@shared/components/Button/Button';
import { addTrack, setCurrentTrackIndex } from '@features/playlist/playlistSlice';
import { useAudio } from '@/shared/hooks/useAudio';
import { useAppDispatch } from '@app/hooks';

const ACCEPTED_AUDIO_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/flac': ['.flac'],
};

interface UploadTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function UploadTrackModal({ isOpen, onClose, groupId }: UploadTrackModalProps) {
  const dispatch = useAppDispatch();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { play } = useAudio();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setUploadedFile(null);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !groupId) return;

    setIsUploading(true);
    setError(null);
    setUploadedFile(null);

    try {
      const response = await uploadService.uploadAudio(selectedFile, groupId);

      queryClient.invalidateQueries({ queryKey: ['group', groupId] });

      dispatch(setCurrentTrackIndex({ index: 0 }));
      dispatch(
        addTrack({
          id: response.id,
          title: response.title,
          artist: response.title ?? 'Unknown',
          url: response.url,
          duration: response.duration,
        })
      );

      setUploadedFile({
        name: response.title,
        url: response.url,
      });

      toast.success('Track uploaded and added to playlist!');

      setTimeout(() => {
        handleClose();
        play();
      }, 1000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || 'Error uploading the file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setUploadedFile(null);
      setError(null);
      onClose();
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_AUDIO_TYPES,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Track" size="lg">
      <div className="space-y-6">
        {!selectedFile && !uploadedFile && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
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
              <div className="mx-auto w-16 h-16 text-primary-600 dark:text-primary-400">
                <Upload size={64} className="mx-auto" />
              </div>
              {isDragActive ? (
                <div>
                  <p className="text-lg font-medium text-primary-600 dark:text-primary-400">
                    Drop the file here
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-light-text dark:text-dark-text">
                    Drag and drop your audio file or click to select
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
                    Supported formats: MP3, WAV, OGG, M4A, FLAC
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedFile && !uploadedFile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-600/10 dark:bg-primary-400/10 flex items-center justify-center">
                  <Upload size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-light-text dark:text-dark-text truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors text-light-text-secondary dark:text-dark-text-secondary hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-500/10 dark:bg-red-900/30 border border-red-500/20 dark:border-red-700/50 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Upload failed
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {uploadedFile && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-green-500/10 dark:bg-green-900/30 border border-green-500/20 dark:border-green-700/50 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Track uploaded successfully!
                  </p>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                    {uploadedFile.name} has been added to the playlist
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-4 border-t border-light-hover dark:border-dark-hover">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1"
          >
            {uploadedFile ? 'Close' : 'Cancel'}
          </Button>
          {selectedFile && !uploadedFile && (
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              isLoading={isUploading}
              disabled={isUploading || !selectedFile}
              className="flex-1"
            >
              Upload Track
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
