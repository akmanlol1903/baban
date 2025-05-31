import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Video = Database['public']['Tables']['videos']['Row'];
type Comment = Database['public']['Views']['comment_details']['Row'];

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  comments: Comment[];
  loading: boolean;
  watchTimes: Record<string, number>;
  favoriteVideos: string[];
  leaderboard: {
    video_id: string;
    title: string;
    uploader_id: string;
    uploader_username: string;
    uploader_avatar_url: string | null;
    total_watch_time: number;
    watcher_count: number;
  }[];
  fetchVideos: () => Promise<void>;
  fetchVideoById: (id: string) => Promise<Video | null>;
  updateWatchTime: (videoId: string, secondsWatched: number) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  uploadVideo: (videoData: { title: string; description: string; url: string; thumbnail_url?: string }) => Promise<boolean>;
  updateVideo: (videoId: string, videoData: { title: string; description: string; url: string; thumbnail_url?: string }) => Promise<boolean>;
  voteForVideo: (videoId: string) => Promise<boolean>;
  deleteVideo: (videoId: string) => Promise<boolean>;
  fetchComments: (videoId: string) => Promise<void>;
  addComment: (videoId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleFavorite: (videoId: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  currentVideo: null,
  comments: [],
  loading: false,
  watchTimes: {},
  favoriteVideos: [],
  leaderboard: [],
  
  fetchVideos: async () => {
    set({ loading: true });
    
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching videos:', error);
      set({ loading: false });
      return;
    }
    
    set({ videos: data || [], loading: false });
    
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const { data: watchTimeData } = await supabase
        .from('watch_time')
        .select('video_id, seconds_watched')
        .eq('user_id', user.id);
        
      if (watchTimeData) {
        const watchTimes: Record<string, number> = {};
        watchTimeData.forEach((wt) => {
          watchTimes[wt.video_id] = wt.seconds_watched;
        });
        
        set({ watchTimes });
      }

      await get().fetchFavorites();
    }
  },

  fetchFavorites: async () => {
    const { data: favoritesData, error } = await supabase
      .from('favorites')
      .select('video_id');

    if (error) {
      console.error('Error fetching favorites:', error);
      return;
    }

    if (favoritesData) {
      set({ favoriteVideos: favoritesData.map(f => f.video_id) });
    }
  },

  toggleFavorite: async (videoId: string) => {
    const { favoriteVideos } = get();
    const isFavorited = favoriteVideos.includes(videoId);
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) return;

    if (isFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing favorite:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          video_id: videoId,
          user_id: user.id
        });

      if (error) {
        console.error('Error adding favorite:', error);
        return;
      }
    }

    await get().fetchFavorites();
  },
  
  fetchVideoById: async (id: string) => {
    set({ loading: true });
    
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching video:', error);
      set({ loading: false, currentVideo: null });
      return null;
    }
    
    set({ currentVideo: data, loading: false });
    return data;
  },
  
  updateWatchTime: async (videoId: string, secondsWatched: number) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    
    const { data: existingData } = await supabase
      .from('watch_time')
      .select('id, seconds_watched')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();
      
    const now = new Date().toISOString();
    
    if (existingData) {
      const newSecondsWatched = existingData.seconds_watched + secondsWatched;
      await supabase
        .from('watch_time')
        .update({
          seconds_watched: newSecondsWatched,
          last_watched: now,
          updated_at: now
        })
        .eq('id', existingData.id);
        
      set((state) => ({
        watchTimes: {
          ...state.watchTimes,
          [videoId]: newSecondsWatched
        }
      }));
    } else {
      await supabase
        .from('watch_time')
        .insert({
          user_id: user.id,
          video_id: videoId,
          seconds_watched: secondsWatched,
          last_watched: now,
          created_at: now,
          updated_at: now
        });
        
      set((state) => ({
        watchTimes: {
          ...state.watchTimes,
          [videoId]: secondsWatched
        }
      }));
    }
  },
  
  fetchLeaderboard: async () => {
    const { data, error } = await supabase
      .rpc('get_leaderboard');
      
    if (error) {
      console.error('Error fetching leaderboard:', error);
      return;
    }
    
    set({ leaderboard: data || [] });
  },
  
  uploadVideo: async (videoData) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;
    
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (!userData?.is_admin) {
      console.error('Only admins can upload videos');
      return false;
    }
    
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('videos')
      .insert({
        ...videoData,
        uploaded_by: user.id,
        created_at: now,
        updated_at: now
      });
      
    if (error) {
      console.error('Error uploading video:', error);
      return false;
    }
    
    await get().fetchVideos();
    return true;
  },

  updateVideo: async (videoId: string, videoData) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;
    
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (!userData?.is_admin) {
      console.error('Only admins can update videos');
      return false;
    }
    
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('videos')
      .update({
        ...videoData,
        updated_at: now
      })
      .eq('id', videoId);
      
    if (error) {
      console.error('Error updating video:', error);
      return false;
    }
    
    await get().fetchVideos();
    return true;
  },
  
  voteForVideo: async (videoId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;
    
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();
      
    if (existingVote) {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', existingVote.id);
        
      if (error) {
        console.error('Error removing vote:', error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          video_id: videoId,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error adding vote:', error);
        return false;
      }
    }
    
    return true;
  },

  deleteVideo: async (videoId: string) => {
    // Delete cum markers first
    const { error: cumMarkersError } = await supabase
      .from('cum_markers')
      .delete()
      .eq('video_id', videoId);

    if (cumMarkersError) {
      console.error('Error deleting cum markers:', cumMarkersError);
    }

    // Then delete the video
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      console.error('Error deleting video:', error);
      return false;
    }

    set(state => ({
      videos: state.videos.filter(v => v.id !== videoId),
      currentVideo: null
    }));

    return true;
  },

  fetchComments: async (videoId: string) => {
    const { data, error } = await supabase
      .from('comment_details')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    set({ comments: data || [] });
  },

  addComment: async (videoId: string, content: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase
      .from('comments')
      .insert({
        video_id: videoId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error adding comment:', error);
      return;
    }

    await get().fetchComments(videoId);
  },

  deleteComment: async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      return;
    }

    const currentVideo = get().currentVideo;
    if (currentVideo) {
      await get().fetchComments(currentVideo.id);
    }
  }
}));