import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Users,
  Music,
  ArrowLeft,
  Crown,
  UserPlus,
  UserMinus,
  Music2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

import type { DialogType, IGroupUsers, Member } from '@/features/groups/groups.types';

import {
  playListSelectors,
  setCurrentTrackIndex,
  setPlaylistFromApi,
} from '@/features/playlist/playlistSlice';
import { ScreenLockedDueLackInteraction } from './GroupPage/components/ScreenLockedDueLackInteraction';
import { AudioPlayerListener } from '@/features/audio/components/AudioPlayerListener';
import { MediaSessionSection } from '@/features/media/components/MediaSessionSection';
import { PlaylistListener } from '@/features/playlist/components/PlaylistListener';
import { PlaylistCompact } from '@/features/playlist/components/PlaylistCompact';
import { AvatarPreview } from '@/shared/components/AvatarPreview/AvatarPreview';
import { AudioPlayerHost } from '@/features/audio/components/AudioPlayerHost';
import { GroupPageSkeleton } from './GroupPage/components/GroupPageSkeleton';
import { AddMemberModal } from '@/features/groups/components/AddMemberModal';
import { PlaylistHost } from '@/features/playlist/components/PlaylistHost';
import DeleteDialog from '@/shared/components/DeleteDialog/DeleteDialog';
import AlertDialog from '@/shared/components/AlertDialog/AlertDialog';
import SpotifyAccount from './ProfilePage/components/SpotifyAccount';
import { Button } from '@shared/components/Button/Button';
import Example from './GroupPage/components/Example';

import { createSessionStart, joinSessionStart, setRole } from '@/features/session/sessionSlice';
import { setTrack, setAudioState } from '@/features/audio/audioSlice';
import PlaylistAdapter from '@/features/playlist/playlistAdapter';
import { getAudioService } from '@services/audio/audioService';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { groupsApi } from '@/features/groups/groupsApi';
import { useAudio } from '@/shared/hooks/useAudio';
import { withAuth } from '@/shared/hoc/withAuth';
import { cn, orderBy, extractSpotifyId, isSpotifyUrl } from '@/shared/utils';
import {
  playSpotifyTrack,
  initSpotifyPlayer,
  isSpotifyPlayerReady,
} from '@/features/spotify/spotifyPlayerService';
import { compensateStalePosition, SPOTIFY_PLAY_OVERHEAD_MS } from '@/shared/utils';
import { paths } from '@/routes/paths';
import { store } from '@/app/store';
import { isSpotifyConnected } from '@/features/spotify/spotifyAuth';

const GroupPage = () => {
  const { play, pause, needsInteraction, setNeedsInteraction } = useAudio();
  const { createSession, joinSession, leaveSession } = useWebSocket();
  const { groupId } = useParams<{ groupId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const listenerAudioInitializedRef = useRef<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  type SpotifyStatus = 'idle' | 'connecting' | 'ready' | 'error';
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus>('idle');
  const [spotifyStatusMsg, setSpotifyStatusMsg] = useState<string>('');
  const [isDeleteMember, setIsDeleteMember] = useState(false);
  const processedGroupIdRef = useRef<string | null>(null);
  const createdByRef = useRef<string | null>(null);
  const isHostRef = useRef<boolean | null>(null);
  const disconnectSentRef = useRef(false);
  const isConnectingRef = useRef(false);

  const connectionUsers = useAppSelector((state) => state.session.connectionUsers);
  const isConnected = useAppSelector((state) => state.connection.isConnected);
  const audioState = useAppSelector((state) => state.audio);
  const user = useAppSelector((state) => state.auth.user);
  const tracks = useAppSelector(playListSelectors.tracks);
  const sessionRole = useAppSelector((state) => state.session.role);
  const spotifyConnected = isSpotifyConnected();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroupById(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
    retry: false,
  });

  const { data: groupPlaybackStateData } = useQuery({
    queryKey: ['group-playback-state', groupId],
    queryFn: () => groupsApi.getGroupPlaybackState(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
    retry: false,
  });

  const group = data?.status && data?.group ? data.group : null;
  const isSpotifyOnly = group?.music_type === 'spotify_only';
  const isOwner = group?.created_by === user?.id;
  const members = group?.members || [];
  const USER_MEMBERS = [...members];

  useEffect(() => {
    if (!groupPlaybackStateData?.playbackState || !groupId) return;
    // Wait until the WebSocket role is set — this effect re-runs when sessionRole changes
    if (!sessionRole) return;

    const { playbackState: state } = groupPlaybackStateData;
    const currentRole = sessionRole;

    // Detect Spotify — server may send appleMusicId/source:"spotify" with trackUrl null,
    // or may put the Spotify URL (https://open.spotify.com/track/...) inside trackUrl.
    const rawTrackUrl = state.trackUrl || '';
    const spotifyId =
      (state as any).appleMusicId ||
      (state as any).spotifyId ||
      extractSpotifyId(rawTrackUrl) ||
      undefined;
    const isSpotify =
      !!spotifyId || isSpotifyUrl(rawTrackUrl) || (state as any).source === 'spotify';

    // A "track" is present if there is a usable file URL or a Spotify track ID
    const hasTrack = !!(rawTrackUrl && !isSpotify) || isSpotify;

    const match =
      (currentRole === 'dj' || currentRole === 'member') &&
      hasTrack &&
      listenerAudioInitializedRef.current !== groupId;

    if (!match) return;

    try {
      listenerAudioInitializedRef.current = groupId;

      // Position from the server is already in seconds.
      // The REST API snapshot is stale — advance position by the time elapsed since
      // the server recorded it (lastEventTime) to compensate.
      const rawPosition = Math.max(0, state.position ?? 0);
      const currentPosition = compensateStalePosition(
        rawPosition,
        state.lastEventTime,
        state.isPlaying
      );
      const currentTimestamp = state.lastEventTime || Date.now();

      if (isSpotify) {
        // Show initial state in the UI immediately (stale-compensated position)
        dispatch(
          setAudioState({
            isPlaying: state.isPlaying,
            currentPosition,
            trackDuration: state.duration ?? undefined,
            trackTitle: state.trackTitle ?? undefined,
            trackArtist: state.trackArtist ?? undefined,
            spotifyId,
            trackSource: 'spotify',
            trackUrl: '',
            trackId: spotifyId || state.trackId || '',
            volume: 100,
            timestamp: currentTimestamp,
          })
        );

        // Only members need to start playback — the DJ controls their own Spotify player.
        if (currentRole === 'member' && spotifyId) {
          // Anchor point: raw server position at snapshotTime.
          // All latency calculations are done relative to this single reference so we
          // never double-count elapsed time.
          const snapshotPosition = rawPosition; // seconds (server value)
          const snapshotTime =
            state.lastEventTime > 0 // Unix ms
              ? state.lastEventTime
              : Date.now();
          const shouldPlay = state.isPlaying;

          /**
           * Called once the Spotify SDK is ready (device_id obtained).
           * Calculates where the track is *right now* and starts playback
           * accounting for the Spotify REST API startup overhead.
           */
          const doPlay = (ok: boolean) => {
            if (!ok) {
              setSpotifyStatus('error');
              setSpotifyStatusMsg(
                'No se pudo conectar el reproductor de Spotify. Verifica que tu cuenta Premium esté activa.'
              );
              return;
            }

            setSpotifyStatus('ready');
            setSpotifyStatusMsg(shouldPlay ? 'Reproduciendo en Spotify' : 'Listo para reproducir');
            setTimeout(() => setSpotifyStatus('idle'), 4000);

            if (!shouldPlay) return; // paused — SDK connected but don't force play

            // ─── Intelligent position calculation ───────────────────────────
            // snapshotPosition: where the track was at snapshotTime (server truth)
            // elapsedSinceSnapshot: wall-clock time from server snapshot → now
            //   (covers REST API fetch time + SDK init time + any other delay)
            // SPOTIFY_PLAY_OVERHEAD_MS: extra time the Spotify REST API needs to
            //   actually start sending audio after PUT /player/play is called
            //
            // Result = where the speaker will actually be playing when audio starts.
            const elapsedSinceSnapshot = (Date.now() - snapshotTime) / 1000;
            const overheadSeconds = SPOTIFY_PLAY_OVERHEAD_MS / 1000;
            const targetPositionMs = Math.max(
              0,
              (snapshotPosition + elapsedSinceSnapshot + overheadSeconds) * 1000
            );
            // ────────────────────────────────────────────────────────────────

            playSpotifyTrack(spotifyId!, targetPositionMs).catch((err) => {
              setSpotifyStatus('error');
              setSpotifyStatusMsg(err instanceof Error ? err.message : 'Error al iniciar Spotify');
              console.error('Error starting Spotify for listener on page load:', err);
            });
          };

          // Wired to SDK player_state_changed — keeps Redux in sync while playing
          const onSdkStateChange = (sdkState: {
            isPlaying: boolean;
            currentPosition: number;
            trackDuration?: number;
            trackId?: string;
            trackTitle?: string;
            trackArtist?: string;
          }) => {
            dispatch(
              setAudioState({
                isPlaying: sdkState.isPlaying,
                currentPosition: sdkState.currentPosition,
                trackDuration: sdkState.trackDuration,
                trackTitle: sdkState.trackTitle ?? undefined,
                trackArtist: sdkState.trackArtist ?? undefined,
                spotifyId: sdkState.trackId ?? spotifyId,
                trackSource: 'spotify',
                trackUrl: '',
                trackId: sdkState.trackId ?? spotifyId ?? '',
                volume: store.getState().audio.volume ?? 100,
                timestamp: Date.now(),
              })
            );
          };

          if (isSpotifyPlayerReady()) {
            // SDK already connected — jump straight to play with full latency compensation
            doPlay(true);
          } else {
            // SDK not ready: show connecting state, init (waits for ready event), then play
            setSpotifyStatus('connecting');
            setSpotifyStatusMsg('Conectando reproductor de Spotify…');
            initSpotifyPlayer(onSdkStateChange)
              .then(doPlay)
              .catch((err) => {
                setSpotifyStatus('error');
                setSpotifyStatusMsg(
                  err instanceof Error ? err.message : 'Error al conectar Spotify'
                );
                console.error('Error initializing Spotify player for listener:', err);
              });
          }
        }
        return;
      }

      // File-based track
      const trackId = state.trackId || rawTrackUrl || '';
      dispatch(
        setTrack({
          trackId,
          trackUrl: rawTrackUrl,
          trackTitle: state.trackTitle ?? undefined,
          trackArtist: state.trackArtist ?? undefined,
        })
      );

      const audioService = getAudioService();

      let validPosition = currentPosition;
      if (state.duration && state.duration > 0) {
        validPosition = Math.min(validPosition, state.duration);
      }

      // Validar timestamp - si es muy grande o inválido, usar el actual
      let validTimestamp = Date.now();
      if (currentTimestamp > 0) {
        const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
        if (Math.abs(currentTimestamp - Date.now()) < oneYearInMs) {
          validTimestamp = currentTimestamp;
        }
      }

      audioService.init(rawTrackUrl, (audioState) => {
        dispatch(setAudioState(audioState));
      });

      setTimeout(() => {
        audioService.sync(validPosition, validTimestamp, state.isPlaying, rawTrackUrl);
      }, 500);
    } catch (error) {
      console.error('Error al inicializar audio en GroupPage:', error);
      listenerAudioInitializedRef.current = null;
    }
  }, [groupPlaybackStateData, groupId, dispatch, sessionRole]);

  const handleLeaveGroup = () => {
    // dispatch(leaveSessionSlice());
    leaveSession();
  };

  const playlist = useMemo(() => {
    return data?.group
      ? (Array.isArray(data.group.current_track)
          ? data.group.current_track
          : [data.group.current_track]
        ).filter((track) => !!track)
      : null;
  }, [data]);

  const createdBy = useMemo(() => {
    if (!data?.group) return;
    if (createdByRef.current === data.group?.created_by) return data.group?.created_by;
    createdByRef.current = data?.group?.created_by || null;
    return data?.group?.created_by;
  }, [data]);

  useEffect(() => {
    if (playlist) {
      const tracks = orderBy(playlist.map(PlaylistAdapter.toCurrentTrack), 'addedAt', 'desc');
      dispatch(setPlaylistFromApi({ tracks }));
      const isHost = createdBy === user?.id;
      if (!isHost) return;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      timeoutId = setTimeout(() => {
        if (tracks.length > 0) {
          const index = 0;
          const track = tracks[index];
          if (!track) return;
          dispatch(setCurrentTrackIndex({ index }));
          dispatch(
            setTrack({
              trackId: track.id,
              trackUrl: track.url,
              trackTitle: track.title,
              trackArtist: track.artist,
              trackSource: track.source,
              spotifyId: track.spotifyId,
            })
          );
          if (!createdByRef.current || !createdBy || createdByRef.current === createdBy) return;
          setTimeout(play, 1000);
        }
      }, 400);
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [dispatch, playlist, createdBy, user]);

  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!data || !user || isConnectingRef.current || !user) return;
    if (processedGroupIdRef.current === data.group.id) return;

    const connectToSession = () => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;
      processedGroupIdRef.current = data.group.id;

      if (data.group.created_by !== user?.id) {
        if (data.group.members?.some((member) => member.user_id === user?.id)) {
          const sessionName = data.group.id;
          dispatch(setRole({ role: 'member' }));
          dispatch(joinSessionStart({ sessionId: sessionName }));
          joinSession(sessionName);
          isHostRef.current = false;
        }
        return;
      }
      const sessionName = data.group.id;
      dispatch(setRole({ role: 'dj' }));
      dispatch(createSessionStart({ name: sessionName }));
      createSession(sessionName, user);
      isHostRef.current = true;
    };

    if (isConnected) {
      connectionTimeoutRef.current = setTimeout(() => {
        connectToSession();
      }, 500);
    } else {
      let checkConnectionInterval: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      checkConnectionInterval = setInterval(() => {
        if (isConnected && !isConnectingRef.current) {
          clearInterval(checkConnectionInterval!);
          if (timeoutId) clearTimeout(timeoutId);
          connectionTimeoutRef.current = setTimeout(() => {
            connectToSession();
          }, 800);
        }
      }, 100);

      timeoutId = setTimeout(() => {
        if (checkConnectionInterval) clearInterval(checkConnectionInterval);
        if (!isConnected) {
          console.warn('Timeout: Could not establish WebSocket connection');
          toast.error('Failed to connect to server. Please refresh the page.');
          isConnectingRef.current = false;
        }
      }, 10000);

      return () => {
        if (checkConnectionInterval) clearInterval(checkConnectionInterval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [
    data?.group,
    data?.group.created_by,
    user,
    isConnected,
    dispatch,
    createSession,
    joinSession,
  ]);

  useEffect(() => {
    processedGroupIdRef.current = null;
    isConnectingRef.current = false;
    isHostRef.current = null;
    listenerAudioInitializedRef.current = null;
  }, [groupId]);

  const groupUsers = useMemo(() => {
    const data: IGroupUsers = {
      dj: null,
      members: [],
    };

    for (const member of members) {
      if (member.role === 'dj') {
        data.dj = member;
      } else if (member.role === 'member') {
        data.members.push(member);
      }
    }
    return data;
  }, [members]);

  const onlineMembers = groupUsers.members.filter((member) => connectionUsers[member.user_id]);
  const offlineMembers = groupUsers.members.filter((member) => !connectionUsers[member.user_id]);

  useEffect(() => {
    return () => {
      handleLeaveGroup();
    };
  }, [groupId]);

  const handleRemoveMember = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteMember(true);
  };

  useEffect(() => {
    if (!data) return;
    const members = data.group?.members || ([] as Member[]);
    const exists = members.some((member) => member.user_id === user?.id);
    if (!exists) {
      navigate(paths.LISTENERS(null));
    }
  }, [data]);

  const sendDjDisconnect = async (useKeepalive = false) => {
    if (!groupId || !isOwner || disconnectSentRef.current) return;

    const currentAudioState = store.getState().audio;
    const hasTrack = !!currentAudioState.trackUrl;
    const isPlaying = currentAudioState.isPlaying || false;

    disconnectSentRef.current = true;

    try {
      if (useKeepalive) {
        const payload = {
          groupId,
          hasTrack,
          isPlaying,
        };
        groupsApi.djToggleConnect(payload, 'disconnect');
      } else {
        await groupsApi.djDisconnect({
          groupId,
          hasTrack,
          isPlaying,
        });
      }
    } catch (error) {
      console.error('Error al enviar desconexión del DJ:', error);
      disconnectSentRef.current = false;
    }
  };

  useEffect(() => {
    if (!isOwner || !groupId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentAudioState = store.getState().audio;
      const isPlaying = currentAudioState.isPlaying || false;

      if (isPlaying) {
        sendDjDisconnect(true);

        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOwner, groupId, audioState.isPlaying]);

  useEffect(() => {
    disconnectSentRef.current = false;
  }, [groupId]);

  if (isLoading) {
    return <GroupPageSkeleton />;
  }

  if (error || !group) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">😕</div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
              Group not found
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
              {error instanceof Error
                ? error.message
                : 'The group you are looking for does not exist or you do not have access to it.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => navigate(-1)} variant="primary">
                Back to Groups
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onConfirmLeaveGroup = async () => {
    setDialogOpen(null);
    pause();
    await sendDjDisconnect(false);
    navigate(isOwner ? paths.GROUPS(null) : paths.LISTENERS(null));
  };

  const onRejectLeaveGroup = () => {
    setDialogOpen(null);
  };

  const onGoBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isOwner && groupId) {
      const isPlaying = audioState.isPlaying || false;
      if (isPlaying) {
        e.preventDefault();
        setDialogOpen('leave-group');
      }
    }
  };

  const handleAudioInteraction = async () => {
    try {
      const audioService = getAudioService();
      await audioService.play();
      setNeedsInteraction(false);
    } catch (error) {
      console.error('Error playing audio after interaction:', error);
    }
  };

  return (
    <>
      <ScreenLockedDueLackInteraction
        handleAudioInteraction={handleAudioInteraction}
        needsInteraction={needsInteraction}
        audioState={audioState}
      />
      <AlertDialog
        onConfirmation={onConfirmLeaveGroup}
        open={dialogOpen === 'leave-group'}
        onRejection={onRejectLeaveGroup}
      />
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="mb-4 mt-2">
          <Link
            to={isOwner ? paths.GROUPS(null) : paths.LISTENERS(null)}
            onClick={onGoBack}
            className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </Link>
        </div>

        {(() => {
          const hasPlaylistTracks = (playlist?.length ?? 0) > 0;
          const hasCurrentTrack = !!(audioState.trackId || audioState.spotifyId);
          const showPlayer = hasPlaylistTracks || hasCurrentTrack;
          return !showPlayer;
        })() ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover p-6 mb-4"
          >
            {playlist?.length !== 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <Music size={20} />
                  Tracks
                </h2>
              </div>
            )}
            {isHostRef.current && groupId && (
              <PlaylistHost groupId={groupId} isIsSpotifyOnly={isSpotifyOnly} />
            )}
            {!isHostRef.current && <PlaylistListener />}
          </motion.div>
        ) : (
          <>
            {isHostRef.current && (
              <AudioPlayerHost
                playlistCount={playlist?.length ?? tracks.length ?? 0}
                disabledControls={isSpotifyOnly && !spotifyConnected}
              />
            )}
            {!isHostRef.current && (
              <>
                {/* Spotify connection status banner — only for listeners with a Spotify track */}
                {spotifyStatus !== 'idle' && (
                  <motion.div
                    key={spotifyStatus}
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className={`mb-3 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors
                      ${spotifyStatus === 'connecting' ? 'bg-[#1DB954]/10 border-[#1DB954]/30 text-[#1DB954]' : ''}
                      ${spotifyStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : ''}
                      ${spotifyStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400' : ''}
                    `}
                  >
                    {/* Icon */}
                    <span className="shrink-0">
                      {spotifyStatus === 'connecting' && (
                        <Loader2 size={18} className="animate-spin text-[#1DB954]" />
                      )}
                      {spotifyStatus === 'ready' && (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      )}
                      {spotifyStatus === 'error' && (
                        <AlertCircle size={18} className="text-red-500 dark:text-red-400" />
                      )}
                    </span>

                    {/* Spotify logo + message */}
                    <span className="flex items-center gap-2 flex-1 min-w-0">
                      <Music2 size={14} className="shrink-0 opacity-70" />
                      <span className="truncate">{spotifyStatusMsg}</span>
                    </span>

                    {/* Connecting animated dots */}
                    {spotifyStatus === 'connecting' && (
                      <span className="flex gap-1 shrink-0">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#1DB954]"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </span>
                    )}

                    {/* Dismiss error */}
                    {spotifyStatus === 'error' && (
                      <button
                        onClick={() => setSpotifyStatus('idle')}
                        className="shrink-0 ml-auto text-xs opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
                      >
                        Cerrar
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Waiting for DJ indicator — shown when Spotify track is known but DJ hasn't pressed play yet */}
                {spotifyStatus === 'idle' &&
                  audioState.spotifyId &&
                  !audioState.isPlaying &&
                  sessionRole === 'member' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#1DB954]/30 bg-[#1DB954]/5 text-sm text-[#1DB954]/80"
                    >
                      <Wifi size={15} className="shrink-0 opacity-70" />
                      <span>Esperando que el DJ inicie la reproducción de Spotify…</span>
                      <motion.span
                        className="ml-auto w-2 h-2 rounded-full bg-[#1DB954]/50 shrink-0"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                  )}

                <AudioPlayerListener name={tracks?.[0]?.title} artist={tracks?.[0]?.artist} />
              </>
            )}
          </>
        )}

        <Example groupId={groupId!} isSpotifyOnly={isSpotifyOnly} />

        {groupUsers.dj && (
          <div>
            <div className={cn('mb-2 sm:gap-2')}>
              <div className="flex flex-col gap-2 bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover overflow-y-auto [overscroll-behavior:contain]">
                <MemberCard
                  isConnected={!!connectionUsers[groupUsers.dj.user_id]}
                  onRemove={handleRemoveMember}
                  key={groupUsers.dj.id}
                  member={groupUsers.dj}
                  isOwner
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <PlaylistCompact />
        </div>

        <div className="flex justify-between mt-4">
          <h2 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mb-2">
            <Users size={18} />
            Members ({groupUsers.members.length})
          </h2>
          {isOwner && groupId && (
            <Button
              onClick={() => setIsAddMemberModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <UserPlus size={16} />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className=""
          >
            {USER_MEMBERS.length === 0 ? (
              <div className="text-center py-8">
                <Users
                  size={48}
                  className="mx-auto text-light-text-secondary dark:text-dark-text-secondary mb-2 opacity-50"
                />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  No members yet
                </p>
              </div>
            ) : (
              <div>
                {onlineMembers.length > 0 && (
                  <div className="mb-2">
                    <div className="col-span-2 sticky top-0 z-10">
                      <h3 className="text-xs text-zinc-400 mb-1 select-none font-semibold">
                        Online <span className="mx-1.5">&#822;</span> {onlineMembers.length}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-2 bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover max-h-[420px] overflow-y-auto [overscroll-behavior:contain]">
                      {onlineMembers.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          onRemove={handleRemoveMember}
                          isConnected={!!connectionUsers[member.user_id]}
                          me={member.user_id === user?.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {offlineMembers.length > 0 && (
                  <div
                    className={cn(
                      'mb-2',
                      isOwner ? 'sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2' : ''
                    )}
                  >
                    <div className="col-span-2 sticky top-0 z-10">
                      <h3 className="text-xs text-zinc-400 mb-1 select-none font-semibold">
                        Offline <span className="mx-1.5">&#822;</span> {offlineMembers.length}{' '}
                      </h3>
                      {offlineMembers.length !== 0 && (
                        <div className="flex flex-col gap-2 bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover  max-h-[420px] overflow-y-auto [overscroll-behavior:contain]">
                          {offlineMembers.map((member) => (
                            <MemberCard
                              key={member.id}
                              member={member}
                              onRemove={handleRemoveMember}
                              isConnected={!!connectionUsers[member.user_id]}
                              me={member.user_id === user?.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        <div className="mt-4">
          <MediaSessionSection
            userName={user?.displayName || user?.name || user?.nickname}
            currentUserId={user?.id}
            groupId={groupId!}
            isOwner={isOwner}
            members={members}
          />
        </div>

        {isSpotifyOnly && <SpotifyAccount className="mt-4" />}

        <h2 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mt-4">
          Group Information
        </h2>
        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover p-4"
        >
          <div className="flex items-center gap-2 justify-between">
            <p className="text-sm text-zinc-400 mb-1">Name</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-zinc-600 dark:text-zinc-400 font-semibold">
                {group.name}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <p className="text-sm text-zinc-400 mb-1">Code</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {group.code}
              </code>
            </div>
          </div>
        </motion.div>
      </div>
      {groupId && (
        <AddMemberModal
          onSuccess={(message) => toast.success(message)}
          onClose={() => setIsAddMemberModalOpen(false)}
          isOpen={isAddMemberModalOpen}
          groupId={groupId}
        />
      )}
      <DeleteDialog
        modelNameValue={selectedMember?.display_name || 'Unknown'}
        mutationFn={groupsApi.removeMemberFromGroup}
        onClose={() => setIsDeleteMember(false)}
        queryKeys={[['group', groupId!]]}
        isOpen={isDeleteMember}
        payload={{ id: selectedMember?.id ?? '' }}
        modelName="member"
        onSuccess={() => {
          toast.success('Member deleted successfully');
          refetch();
        }}
      />
      <DeleteDialog
        modelNameValue={group.name}
        mutationFn={groupsApi.leaveGroup}
        onClose={() => setIsLeaveGroupDialogOpen(false)}
        queryKeys={[['group', groupId!], ['groups'], ['others-groups']]}
        isOpen={isLeaveGroupDialogOpen}
        payload={{ groupId: groupId! }}
        modelName="group"
        onSuccess={() => {
          handleLeaveGroup();
          navigate(paths.LISTENERS(null));
        }}
      />
    </>
  );
};

interface MemberCardProps {
  member: Member;
  isOwner?: boolean;
  onRemove: (member: Member) => void;
  isConnected: boolean;
  me?: boolean;
}

const MemberCard = ({
  member,
  isOwner = false,
  onRemove,
  isConnected,
  me = false,
}: MemberCardProps) => {
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleAvatarClick = () => {
    if (member.avatar_url) {
      setIsAvatarPreviewOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center last:mb-0 gap-3 hover:border-primary-600/30 transition-colors',
          !isConnected ? 'dark:opacity-30 opacity-40' : ''
        )}
      >
        <div
          className={cn(
            'relative flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white text-sm font-bold',
            member.avatar_url &&
              'cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all'
          )}
          onClick={handleAvatarClick}
        >
          {isConnected && isOwner && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          {member.avatar_url ? (
            <motion.img
              src={member.avatar_url}
              alt={member.name}
              className={cn(
                'w-full h-full rounded-full object-cover relative z-10',
                isOwner ? 'border border-primary' : ''
              )}
              animate={isConnected && isOwner ? { scale: [1, 1.02, 1] } : {}}
              transition={
                isConnected && isOwner ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}
              }
            />
          ) : (
            <motion.div
              className={cn(
                'w-full h-full rounded-full flex items-center justify-center relative z-10',
                isOwner ? 'border-4 border-primary' : ''
              )}
              animate={isConnected && isOwner ? { scale: [1, 1.02, 1] } : {}}
              transition={
                isConnected && isOwner ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}
              }
            >
              {getInitials(member.name || member.guest_name || '?')}
            </motion.div>
          )}
          {isConnected && (
            <div
              className={cn(
                'w-3.5 h-3.5 rounded-full bg-green-500 absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-dark-hover z-20'
              )}
            ></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex justify-between w-full gap-2">
              <p className="font-medium text-light-text dark:text-dark-text truncate">
                {member.display_name || member.name || member.guest_name || 'Unknown'}
              </p>
              {me && (
                <div className="bg-emerald-500 dark:bg-emerald-700 text-white font-semibold px-2 py-1 rounded-full text-center text-[10px] w-10">
                  YOU
                </div>
              )}
            </div>
            {member.role === 'owner' && (
              <Crown size={14} className="text-primary-600 flex-shrink-0" fill="currentColor" />
            )}
          </div>
          {/* <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400 capitalize">{member.role}</span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-400">Joined {formatDate(member.joined_at)}</span>
          </div> */}
        </div>
        {member.role !== 'dj' && !me && (
          <Button
            onClick={() => onRemove(member)}
            variant="ghost-danger"
            size="sm"
            className="flex items-center gap-2"
          >
            <UserMinus size={16} />
          </Button>
        )}
        {isOwner && (
          <div className="bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded-full text-[10px] w-10 text-center">
            DJ
          </div>
        )}
      </div>

      {member.avatar_url && (
        <AvatarPreview
          isOpen={isAvatarPreviewOpen}
          onClose={() => setIsAvatarPreviewOpen(false)}
          imageUrl={member.avatar_url}
          name={member.name || member.guest_name}
        />
      )}
    </>
  );
};

export default withAuth(GroupPage);
