import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { exchangeCodeForTokens } from '@/features/spotify/spotifyAuth';
import { paths } from '@/routes/paths';

export default function SpotifyCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(
        error === 'access_denied' ? 'Spotify connection was cancelled.' : `Spotify error: ${error}`
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received from Spotify.');
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => {
        setStatus('success');
        setTimeout(() => {
          navigate(paths.GROUPS(null), { replace: true });
        }, 1500);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to connect to Spotify');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary-600 dark:text-primary-400" />
            <p className="text-light-text dark:text-dark-text">Connecting to Spotify...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <p className="text-light-text dark:text-dark-text font-medium">
              Spotify connected successfully!
            </p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Redirecting...
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
            <p className="text-light-text dark:text-dark-text font-medium">Connection failed</p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate(paths.GROUPS(null), { replace: true })}
              className="mt-4 px-4 py-2 rounded-lg bg-primary-600 dark:bg-primary-400 text-white hover:opacity-90 transition-opacity"
            >
              Go to Groups
            </button>
          </>
        )}
      </div>
    </div>
  );
}
