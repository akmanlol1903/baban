import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  checkIsAdmin: () => Promise<boolean>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  updateOnlineStatus: (status: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isAdmin: false,
  isOnline: false,
  
  setUser: (user) => {
    if (user) {
      set({ user });
      // Don't await this call to avoid blocking the UI
      get().checkIsAdmin().catch(console.error);
    } else {
      set({ user: null, isAdmin: false, isOnline: false });
    }
  },

  setLoading: (loading) => set({ loading }),
  
  checkIsAdmin: async () => {
    try {
      const user = get().user;
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      if (!data) return false;
      
      const isAdmin = !!data.is_admin;
      set({ isAdmin });
      return isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      set({ isAdmin: false });
      return false;
    }
  },
  
  updateOnlineStatus: async (status: boolean) => {
    try {
      const user = get().user;
      if (!user) return;

      await supabase
        .from('users')
        .update({ 
          is_online: status,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);

      set({ isOnline: status });
    } catch (error) {
      console.error('Error updating online status:', error);
      // Don't update isOnline state if the update failed
    }
  },
  
  signInWithDiscord: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'none'
          }
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error; // Rethrow to let the UI handle the error
    }
  },
  
  signOut: async () => {
    try {
      // Update online status first
      await get().updateOnlineStatus(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth state
      set({ 
        user: null, 
        isAdmin: false, 
        isOnline: false,
        loading: false 
      });
    } catch (error) {
      console.error('Error signing out:', error);
      // Ensure we still clear the state even if there was an error
      set({ 
        user: null, 
        isAdmin: false, 
        isOnline: false,
        loading: false 
      });
    }
  }
}));