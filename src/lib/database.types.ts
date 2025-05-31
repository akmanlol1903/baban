// src/lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ... diğer tablolarınız ...
      users: { // Var olan users tablonuz
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          is_admin: boolean
          verified: boolean
          is_online: boolean
          last_seen: string
          // Bu alanlar morning_stream.sql ve yellow_glitter.sql migration'larından geliyor
          followers_count?: number // morning_stream.sql'den
          following_count?: number // morning_stream.sql'den
          cum_count?: number // morning_stream.sql'den
          total_cum_duration?: number // morning_stream.sql'den
          about?: string | null // damp_island.sql'den
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          is_admin?: boolean
          verified?: boolean
          is_online?: boolean
          last_seen?: string
          followers_count?: number
          following_count?: number
          cum_count?: number
          total_cum_duration?: number
          about?: string | null
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          is_admin?: boolean
          verified?: boolean
          is_online?: boolean
          last_seen?: string
          followers_count?: number
          following_count?: number
          cum_count?: number
          total_cum_duration?: number
          about?: string | null
        }
      }
      videos: { // Var olan videos tablonuz
        Row: {
          id: string
          title: string
          description: string | null
          url: string
          thumbnail_url: string | null
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          url: string
          thumbnail_url?: string | null
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          url?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      comments: { // Var olan comments tablonuz
        Row: {
          id: string
          video_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      profile_comments: { // Var olan profile_comments tablonuz
        Row: {
          id: string
          user_id: string
          profile_username: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_username: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_username?: string
          content?: string
          created_at?: string
        }
      }
      messages: { // Var olan messages tablonuz (chatStore.ts'den anlaşıldığı üzere)
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string | null; // Global mesajlar için null olabilir
          content: string;
          created_at: string;
          edited?: boolean; // mute_limit.sql'den
          updated_at?: string; // mute_limit.sql'den
          reply_to?: string | null; // chatStore.ts'den anlaşıldığı üzere
          reply_to_content?: string | null; // chatStore.ts'den anlaşıldığı üzere
          reply_to_username?: string | null; // chatStore.ts'den anlaşıldığı üzere
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id?: string | null;
          content: string;
          created_at?: string;
          edited?: boolean;
          updated_at?: string;
          reply_to?: string | null;
          reply_to_content?: string | null;
          reply_to_username?: string | null;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string | null;
          content?: string;
          created_at?: string;
          edited?: boolean;
          updated_at?: string;
          reply_to?: string | null;
          reply_to_content?: string | null;
          reply_to_username?: string | null;
        };
      };
      watch_time: { // Var olan watch_time tablonuz
        Row: {
          id: string
          user_id: string
          video_id: string
          seconds_watched: number
          last_watched: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          seconds_watched?: number
          last_watched?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          seconds_watched?: number
          last_watched?: string
          created_at?: string
          updated_at?: string
        }
      }
      votes: { // Var olan votes tablonuz
        Row: {
          id: string
          user_id: string
          video_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          created_at?: string
        }
      }
      follows: { // Var olan follows tablonuz
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      cum_markers: { // Var olan cum_markers tablonuz (cold_ocean.sql'den)
        Row: {
          id: string
          video_id: string
          user_id: string
          timestamp: number
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          timestamp: number
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          timestamp?: number
          created_at?: string
        }
      }
      favorites: { // Var olan favorites tablonuz (wild_lake.sql'den)
        Row: {
          id: string
          video_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          created_at?: string
        }
      }
      // YENİ EKLENEN TABLO
      cum_events: {
        Row: {
          id: string
          video_id: string
          user_id: string
          video_timestamp: number
          created_at: string
          username: string | null
          avatar_url: string | null
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          video_timestamp: number
          created_at?: string
          username?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string
          video_timestamp?: number
          created_at?: string
          username?: string | null
          avatar_url?: string | null
        }
      }
    }
    Views: { // Var olan Views
      comment_details: {
        Row: {
          id: string
          video_id: string
          user_id: string
          content: string
          created_at: string
          username: string
          avatar_url: string | null
          is_admin: boolean
          verified: boolean
        }
      }
      profile_comment_details: {
        Row: {
          id: string
          user_id: string
          profile_username: string
          content: string
          created_at: string
          username: string
          avatar_url: string | null
        }
      }
    }
    Functions: { // Var olan Functions
        get_leaderboard: {
        Args: Record<PropertyKey, never> // Eğer argüman almıyorsa
        Returns: {
            video_id: string;
            title: string;
            uploader_id: string;
            uploader_username: string;
            uploader_avatar_url: string | null;
            total_watch_time: number; // bigintsupabase'de, ts'de number
            watcher_count: number; // bigint supabase'de, ts'de number
        }[]
        }
    }
  }
}