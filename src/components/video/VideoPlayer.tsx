// src/components/video/VideoPlayer.tsx
import { useEffect, useRef, useState } from 'react';
import { useVideoStore } from '../../stores/videoStore';
import { useAuthStore } from '../../stores/authStore';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Minimize } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDuration, cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Database } from '../../lib/database.types'; // Database importu
import { Button } from '../ui/button';

interface VideoPlayerProps {
  videoId: string;
  url: string;
  uploaderId: string;
  isAdmin: boolean;
}

interface CumMarker {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  timestamp: number;
}

// Yeni CumEventData arayüzü
interface CumEventData {
  id: string;
  video_id: string;
  user_id: string;
  video_timestamp: number;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
}


const VideoPlayer = ({ videoId, url }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null); // Ref for the timeline itself
  const { updateWatchTime } = useVideoStore();
  const { user } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [cumMarkers, setCumMarkers] = useState<CumMarker[]>([]);
  const watchTimeIntervalRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef(0);
  const cumStartTimeRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const [showCumAnimation, setShowCumAnimation] = useState(false);
  const [emojis, setEmojis] = useState<{ id: number; emoji: string; style: { top: string; left: string; animationDelay: string } }[]>([]);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [activeMarkerTimestampForTooltip, setActiveMarkerTimestampForTooltip] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeControlTimeoutRef = useRef<number | null>(null);

  // Aktif "cum" olayını saklamak için state
  const [activeCumEvent, setActiveCumEvent] = useState<CumEventData | null>(null);


  useEffect(() => {
    // Fetch initial cum markers for the video
    fetchCumMarkers();
    
    // Subscribe to real-time changes in cum markers
    const markerChannel = supabase
      .channel(`cum-markers-${videoId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cum_markers',
        filter: `video_id=eq.${videoId}`
      }, () => {
        fetchCumMarkers(); // Re-fetch markers on any change
      })
      .subscribe();

    // Subscribe to new cum events for real-time animation
    const cumEventsChannel = supabase
      .channel(`realtime-cum-events-${videoId}`)
      .on<Database['public']['Tables']['cum_events']['Row']>( 
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cum_events',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          const newEvent = payload.new;
          if (newEvent) {
            setActiveCumEvent(newEvent as CumEventData); 
            createEmojis(); // Prepare emojis for animation
            setShowCumAnimation(true); // Trigger animation

            // Hide animation after 3 seconds
            setTimeout(() => {
              setShowCumAnimation(false);
              setEmojis([]);
              setActiveCumEvent(null);
            }, 3000);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on component unmount
    return () => {
      supabase.removeChannel(markerChannel);
      supabase.removeChannel(cumEventsChannel); 
    };
  }, [videoId]);

  useEffect(() => {
    // Keyboard shortcuts for video player controls
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore keyboard events if an input field is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlay(); // Toggle play/pause
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen(); // Toggle fullscreen
          break;
        case 'm':
          e.preventDefault();
          // Toggle mute
          setIsMuted(prev => {
            const newMuted = !prev;
            if (videoRef.current) videoRef.current.muted = newMuted;
            return newMuted;
          });
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          handleSkipBackward(); // Skip backward 10 seconds
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          handleSkipForward(); // Skip forward 10 seconds
          break;
        case 'arrowup':
          e.preventDefault();
          // Increase volume
          setVolume(prev => {
            const newVolume = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = newVolume;
            if (newVolume > 0 && isMuted) setIsMuted(false); // Unmute if volume is increased
            return newVolume;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          // Decrease volume
          setVolume(prev => {
            const newVolume = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = newVolume;
            if (newVolume === 0 && !isMuted) setIsMuted(true); // Mute if volume is zero
            return newVolume;
          });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isMuted, volume]); // Dependencies for keyboard shortcuts

  // Function to fetch cum markers from the database
  const fetchCumMarkers = async () => {
    const { data: markerData, error } = await supabase
      .from('cum_markers')
      .select('id, user_id, timestamp')
      .eq('video_id', videoId);

    if (error) {
      console.error('Error fetching cum markers:', error);
      return;
    }

    if (markerData) {
      // Fetch user details for each marker
      const markers = await Promise.all(
        markerData.map(async (marker) => {
          const { data: userData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', marker.user_id)
            .single();

          return {
            id: marker.id,
            userId: marker.user_id,
            username: userData?.username || 'Unknown User',
            avatarUrl: userData?.avatar_url,
            timestamp: marker.timestamp
          };
        })
      );
      setCumMarkers(markers);
    }
  };
  
  // Group markers by timestamp for display on the timeline
  const groupedMarkers = cumMarkers.reduce<Record<number, CumMarker[]>>((acc, marker) => {
    const timestamp = Math.round(marker.timestamp); // Group by  timestamp
    if (!acc[timestamp]) {
      acc[timestamp] = [];
    }
    acc[timestamp].push(marker);
    return acc;
  }, {});


  // Effect to update video volume and mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Effect to handle video time updates and metadata loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
  
    // Update current time if not dragging timeline
    const handleTimeUpdate = () => {
      if (!isDraggingTimeline) {
        setCurrentTime(video.currentTime);
      }
  
      // Logic to show tooltips for markers near the current time
      if (isPlaying && duration > 0) {
        let newActiveMarkerTimestamp: number | null = null;
        if (Object.keys(groupedMarkers).length > 0) {
            for (const tsStr of Object.keys(groupedMarkers)) {
              const ts = Number(tsStr);
              if (Math.abs(video.currentTime - ts) < 0.75) { // Threshold for showing tooltip
                newActiveMarkerTimestamp = ts;
                break;
              }
            }
        }
        if (activeMarkerTimestampForTooltip !== newActiveMarkerTimestamp) {
          setActiveMarkerTimestampForTooltip(newActiveMarkerTimestamp);
        }
      } else if (!isPlaying && activeMarkerTimestampForTooltip !== null) {
        // Optionally hide tooltip when paused: setActiveMarkerTimestampForTooltip(null); 
      }
    };
  
    // Set video duration once metadata is loaded
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    // Update playing state
    const handlePlayEvent = () => setIsPlaying(true);
    const handlePauseEvent = () => {
      setIsPlaying(false);
    }
  
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlayEvent);
    video.addEventListener('pause', handlePauseEvent);
  
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlayEvent);
      video.removeEventListener('pause', handlePauseEvent);
    };
  }, [isDraggingTimeline, isPlaying, groupedMarkers, duration, activeMarkerTimestampForTooltip]);
  

  // Effect to handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Effect to track and update video watch time
  useEffect(() => {
    if (isPlaying) {
      // Start interval to accumulate watch time
      watchTimeIntervalRef.current = window.setInterval(() => {
        accumulatedTimeRef.current += 1;
        if (accumulatedTimeRef.current >= 5) { // Update every 5 seconds
          updateWatchTime(videoId, accumulatedTimeRef.current);
          accumulatedTimeRef.current = 0;
        }
      }, 1000);
    } else {
      // Clear interval and update remaining watch time if paused
      if (watchTimeIntervalRef.current) {
        clearInterval(watchTimeIntervalRef.current);
        watchTimeIntervalRef.current = null;
        if (accumulatedTimeRef.current > 0) {
          updateWatchTime(videoId, accumulatedTimeRef.current);
          accumulatedTimeRef.current = 0;
        }
      }
    }
    // Cleanup interval on unmount or when isPlaying/videoId changes
    return () => {
      if (watchTimeIntervalRef.current) {
        clearInterval(watchTimeIntervalRef.current);
        if (accumulatedTimeRef.current > 0) {
          updateWatchTime(videoId, accumulatedTimeRef.current);
        }
      }
    };
  }, [isPlaying, videoId, updateWatchTime]);


  // Toggle play/pause state of the video
  const handlePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch(err => console.error("Play error:", err));
      } else {
        videoRef.current.pause();
      }
    }
  };

  // Toggle fullscreen mode for the video player
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  // Show controls on mouse move over the video
  const handleMouseMoveOnVideo = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Hide controls after 3 seconds of inactivity if playing
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };
  
  // Hide controls when mouse leaves video area (if playing and volume slider not shown)
  const handleMouseLeaveVideo = () => {
    if (isPlaying && !showVolumeSlider) { 
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        if(!showVolumeSlider) setShowControls(false);
      }, 500); 
    }
  };

  // Create random emojis for the "cum" animation
  const createEmojis = () => {
    const emojiList = ['💦', '🍆', '�', '😩', '🥵'];
    const newEmojis = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojiList[Math.floor(Math.random() * emojiList.length)],
      style: {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 0.5}s`
      }
    }));
    setEmojis(newEmojis);
  };

  // Handle "cum" event: record event, marker, send chat message, update user stats
  const handleCum = async () => {
    if (!user || !videoRef.current) return;
    const currentVideoTime = Math.floor(videoRef.current.currentTime);
  
    const currentUserUsername = user.user_metadata.username || 'Anonymous';
    const currentUserAvatarUrl = user.user_metadata.avatar_url || null;
  
    // 1. Insert into cum_events table (for real-time animation)
    const { error: cumEventError } = await supabase.from('cum_events').insert({
      video_id: videoId,
      user_id: user.id,
      video_timestamp: currentVideoTime,
      username: currentUserUsername,
      avatar_url: currentUserAvatarUrl,
    });
  
    if (cumEventError) {
      console.error('Error recording cum event:', cumEventError);
    }
  
    // 2. Insert into cum_markers table (for timeline markers)
    await supabase.from('cum_markers').insert({
      video_id: videoId,
      user_id: user.id,
      timestamp: currentVideoTime
    });

    // 3. Post message to global chat
    await supabase.from('messages').insert({
      sender_id: user.id, 
      content: `💦 ${currentUserUsername} just came at ${formatDuration(currentVideoTime)}! 💦`,
      created_at: new Date().toISOString(),
      is_event_message: true, 
    });
  
    // 4. Update user's local cum_count and total_cum_duration
    const timerDuration = cumStartTimeRef.current
      ? Math.floor((Date.now() - cumStartTimeRef.current) / 1000)
      : 0;
    const { data: userData } = await supabase
      .from('users')
      .select('cum_count, total_cum_duration')
      .eq('id', user.id)
      .single();
  
    if (userData) {
      await supabase
        .from('users')
        .update({
          cum_count: (userData.cum_count || 0) + 1,
          total_cum_duration: (userData.total_cum_duration || 0) + timerDuration,
        })
        .eq('id', user.id);
    }
    cumStartTimeRef.current = null; // Reset cum timer
  };

  // Start timer when user presses "cum" button
  const startCumTimer = () => {
    cumStartTimeRef.current = Date.now();
  };

  // Skip video backward by 10 seconds
  const handleSkipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setCurrentTime(videoRef.current.currentTime); 
    }
  };

  // Skip video forward by 10 seconds
  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
      setCurrentTime(videoRef.current.currentTime); 
    }
  };
  
  // Handle mouse move during timeline drag
  const timelineDragMouseMove = (e: MouseEvent) => {
    if (!isDraggingTimeline || !progressContainerRef.current || !videoRef.current || !duration) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos)); 
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration); 
  };
  
  // Add/remove event listeners for timeline drag
  useEffect(() => {
    const timelineDragMouseUp = () => {
      if (isDraggingTimeline) {
        setIsDraggingTimeline(false);
      }
    };
  
    if (isDraggingTimeline) {
      document.addEventListener('mousemove', timelineDragMouseMove);
      document.addEventListener('mouseup', timelineDragMouseUp);
    }
  
    return () => {
      document.removeEventListener('mousemove', timelineDragMouseMove);
      document.removeEventListener('mouseup', timelineDragMouseUp);
    };
  }, [isDraggingTimeline, duration]); 
  

  // Handle mouse down on timeline to start dragging
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressContainerRef.current || !videoRef.current || !duration) return;
    e.preventDefault(); 
    setIsDraggingTimeline(true);
  
    const rect = progressContainerRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  // Handle click on a cum marker on the timeline
  const handleMarkerClick = (timestamp: number) => {
    if (videoRef.current) {
      const wasPaused = videoRef.current.paused; 
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      if (!wasPaused) { 
        videoRef.current.play().catch(err => console.error("Play error on marker click:", err));
      }
    }
  };
  
  // Show volume slider on mouse enter
  const handleVolumeMouseEnter = () => {
    if (volumeControlTimeoutRef.current) {
      clearTimeout(volumeControlTimeoutRef.current);
    }
    setShowVolumeSlider(true);
  };

  // Hide volume slider on mouse leave (with a delay)
  const handleVolumeMouseLeave = () => {
    volumeControlTimeoutRef.current = window.setTimeout(() => {
      setShowVolumeSlider(false);
    }, 200); 
  };
  
  // Check if there are any cum markers to display
  const hasCumMarkers = Object.keys(groupedMarkers).length > 0;

  return (
    <div 
      ref={videoContainerRef}
      className="group/videoplayer relative aspect-video w-full overflow-hidden  bg-black"
      onMouseMove={handleMouseMoveOnVideo} 
      onMouseLeave={handleMouseLeaveVideo} 
    >
      <video
        ref={videoRef}
        src={url}
        className="h-full w-full"
        onClick={handlePlay} 
        onEnded={() => {
          setShowControls(true); 
        }}
      />

      {/* Controls Overlay - Positioned at the bottom, handles opacity */}
      <div 
        className={cn(
          "absolute bottom-3 left-0 right-0 w-[96%] mx-auto", 
          "transition-opacity duration-300 flex items-end justify-between gap-2 md:gap-4", 
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none' 
        )}
      >
        <TooltipProvider>
          {/* Left Group: All operational buttons - Has its own background */}
          <div className="flex items-center shrink-0 gap-1 md:gap-1.5  bg-black/50 px-2.5 py-2 backdrop-blur-sm shadow-md">
              <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                  <Button onClick={handlePlay} size="icon" variant="ghost" className="text-white" aria-label={isPlaying ? "Pause (K or Space)" : "Play (K or Space)"}>
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center"><p>{isPlaying ? "Pause (K or Space)" : "Play (K or Space)"}</p></TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                  <Button onClick={handleSkipBackward} size="icon" variant="ghost" className="text-white" aria-label="Skip Backward (J or ←)">
                      <SkipBack className="h-5 w-5" />
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center"><p>Skip Backward (J or ←)</p></TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                  <Button onClick={handleSkipForward} size="icon" variant="ghost" className="text-white" aria-label="Skip Forward (L or →)">
                      <SkipForward className="h-5 w-5" />
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center"><p>Skip Forward (L or →)</p></TooltipContent>
              </Tooltip>

              {/* Volume Control with Slider */}
              <div 
                  className="relative flex items-center"
                  onMouseEnter={handleVolumeMouseEnter}
                  onMouseLeave={handleVolumeMouseLeave}
              >
                  <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                      <Button
                      onClick={() => {
                          const newMuted = !isMuted;
                          setIsMuted(newMuted);
                          if(videoRef.current) videoRef.current.muted = newMuted;
                      }}
                      size="icon" 
                      variant="ghost" 
                      className="text-white"
                      aria-label={isMuted ? "Unmute (M)" : "Mute (M)"}
                      >
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center"><p>{isMuted ? "Unmute (M)" : "Mute (M)"}</p></TooltipContent>
                  </Tooltip>
                  {/* Volume Slider */}
                  <div 
                      className={cn(
                          "absolute left-full ml-1 origin-left transform transition-all duration-200 ease-in-out overflow-hidden flex items-center",
                          showVolumeSlider ? "w-10 md:w-14 opacity-100" : "w-0 opacity-0" 
                      )}
                      style={{ transformOrigin: 'left' }}
                  >
                      <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setVolume(value);
                          if (videoRef.current) videoRef.current.muted = value === 0;
                          setIsMuted(value === 0);
                          }}
                          className={cn(
                              "h-1 w-full cursor-pointer appearance-none  bg-gray-500/70 accent-red-500", 
                          )}
                          aria-label="Volume"
                      />
                  </div>
              </div>
                {/* "Cum" Button */}
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Button
                    onMouseDown={startCumTimer}
                    onMouseUp={handleCum}
                    onMouseLeave={() => { cumStartTimeRef.current = null; }} 
                    onTouchStart={startCumTimer}
                    onTouchEnd={handleCum}
                    size="icon" 
                    variant="ghost" 
                    className="text-white text-xl leading-none" 
                    aria-label="Mark 'Cum' Point"
                  >
                    💦
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center"><p>Mark "Cum" Point</p></TooltipContent>
            </Tooltip>
            {/* Fullscreen Button */}
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleFullscreen}
                  size="icon" 
                  variant="ghost" 
                  className="text-white"
                  aria-label={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center"><p>{isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}</p></TooltipContent>
            </Tooltip>
          </div>

          {/* Right Group: Time, Progress bar, and Duration - Now with its own background */}
          <div className="flex-1 flex items-center min-w-0 ml-2 md:ml-4 px-2.5 py-2  bg-black/50 backdrop-blur-sm shadow-md">
            {/* Current Time Display */}
            <div className={cn("text-xs font-medium text-white tabular-nums shrink-0 mr-2")}>
                {formatDuration(Math.floor(currentTime))}
            </div>
            {/* Middle section: Cum Markers and Progress Bar (column) */}
            <div className="flex-1 flex flex-col justify-center min-w-0"> 
                {/* Cum Marker Bar */}
                {duration > 0 && hasCumMarkers && (
                    <div className="relative mb-0.5 h-4 w-full"> {/* overflow-hidden kaldırıldı */}
                    {Object.entries(groupedMarkers).map(([timestamp, markers]) => (
                        <Tooltip 
                        key={`tooltip-group-${timestamp}`} 
                        delayDuration={0} 
                        open={activeMarkerTimestampForTooltip === Number(timestamp) || undefined}
                        >
                        <TooltipTrigger asChild>
                            <div
                            className="absolute -top-px flex h-full cursor-pointer items-center"
                            style={{
                                left: `${(Number(timestamp) / duration) * 100}%`,
                                transform: 'translateX(-50%)',
                                zIndex: 20 
                            }}
                            onClick={(e) => {
                                e.stopPropagation(); 
                                handleMarkerClick(Number(timestamp));
                            }}
                            >
                            <div className="flex -space-x-2"> 
                                {markers.slice(0, 3).map((marker, markerIndex) => (
                                <img
                                    key={marker.id}
                                    src={marker.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${marker.userId}`}
                                    alt={marker.username}
                                    className="h-4 w-4  ring-1 ring-black/60 md:h-5 md:w-5" 
                                    style={{ zIndex: markers.length - markerIndex }} 
                                />
                                ))}
                                {markers.length > 3 && ( 
                                <div className="flex h-4 w-4 items-center justify-center  bg-gray-600 text-[0.6rem] font-semibold text-white ring-1 ring-black/60 md:h-5 md:w-5">
                                    +{markers.length - 3}
                                </div>
                                )}
                            </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-xs  bg-black/80 px-2 py-1 text-xs text-white shadow-lg"
                        >
                            <div className="flex flex-col items-center text-center">
                            {markers.slice(0, 3).map(marker => (
                                <div key={marker.id} className="flex items-center py-0.5">
                                <img src={marker.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${marker.userId}`} alt={marker.username} className="mr-1.5 h-3 w-3 "/>
                                <span className="text-[0.7rem]">{marker.username}</span>
                                </div>
                            ))}
                            {markers.length > 3 && (
                                <span className="mt-0.5 text-[0.6rem] text-gray-300"> (+{markers.length - 3} others)</span>
                            )}
                            <span className="mt-0.5 text-[0.6rem] text-gray-400">
                                came at {formatDuration(Number(timestamp))}
                            </span>
                            </div>
                        </TooltipContent>
                        </Tooltip>
                    ))}
                    </div>
                )}
                {/* Main Progress Bar (Draggable) */}
                <div
                    ref={progressContainerRef}
                    className="relative h-1 w-full cursor-pointer  bg-gray-500/60" 
                    onMouseDown={handleTimelineMouseDown}
                >
                    <div
                    className="pointer-events-none h-full  bg-red-500"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    <div 
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2  bg-red-400 shadow"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
            </div>
            {/* Total Duration Display */}
            <div className={cn("text-xs font-medium text-white tabular-nums shrink-0 ml-2")}>
                {formatDuration(Math.floor(duration))}
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Cum Animation Overlay */}
      {showCumAnimation && activeCumEvent && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden">
          {emojis.map((emoji) => (
            <div
              key={emoji.id}
              className="absolute animate-cum text-3xl md:text-4xl" 
              style={{
                top: emoji.style.top,
                left: emoji.style.left,
                animationDelay: emoji.style.animationDelay,
              }}
            >
              {emoji.emoji}
            </div>
          ))}
          <div className=" bg-white/90 px-6 py-3 text-xl font-bold text-gray-900 shadow-2xl md:px-8 md:py-4 md:text-2xl">
            {activeCumEvent.username || 'Birisi'} boşaldı 💦
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;