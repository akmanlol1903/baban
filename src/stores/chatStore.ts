// src/stores/chatStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type UserForSender = Database['public']['Tables']['users']['Row'];

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: UserForSender | { 
    username: string;
    avatar_url: string | null;
    is_admin?: boolean; 
    verified?: boolean; 
    is_online?: boolean; 
    last_seen?: string; 
    id?: string; 
  };
  reply_to?: string;
  reply_to_content?: string;
  reply_to_username?: string;
  // is_event_message is already part of Database['public']['Tables']['messages']['Row']
};

interface ChatState {
  messages: Message[];
  privateChats: Record<string, Message[]>;
  loading: boolean;
  sendGlobalMessage: (
    content: string,
    replyToId?: string | null,
    options?: { isEventMessage?: boolean; eventTriggeringUserId?: string } // eventTriggeringUserId eklendi (opsiyonel)
  ) => Promise<boolean>;
  sendPrivateMessage: (receiverId: string, content: string) => Promise<boolean>;
  fetchGlobalMessages: () => Promise<void>;
  fetchPrivateMessages: (userId: string) => Promise<void>;
  subscribeToMessages: () => () => void;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string | null) => Promise<void>;

  unreadEventNotifications: number;
  incrementUnreadEventNotifications: () => void;
  clearUnreadEventNotifications: () => void;
}

const SYSTEM_SENDER_USERNAME = 'Boşalanzi Bildirimi';
const SYSTEM_SENDER_AVATAR = '/vite.svg'; // Projenizde uygun bir sistem ikonu yolu

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  privateChats: {},
  loading: false,
  unreadEventNotifications: 0,

  incrementUnreadEventNotifications: () => {
    if (!window.location.pathname.endsWith('/chat')) {
      set(state => ({ unreadEventNotifications: state.unreadEventNotifications + 1 }));
    }
  },
  clearUnreadEventNotifications: () => set({ unreadEventNotifications: 0 }),
  
  sendGlobalMessage: async (content: string, replyToId?: string | null, options?: { isEventMessage?: boolean; eventTriggeringUserId?: string }) => {
    const authUser = (await supabase.auth.getUser()).data.user;
    
    if (!authUser) {
      console.error('User not authenticated for sending message');
      return false;
    }

    const messageData: Database['public']['Tables']['messages']['Insert'] = {
      sender_id: authUser.id, // RLS için mesajı atan client'ın ID'si
      content,
      created_at: new Date().toISOString(),
      is_event_message: options?.isEventMessage || false,
    };
    
    if (replyToId) {
      const { data: replyMessage } = await supabase
        .from('messages')
        .select('id, content, sender:users!messages_sender_id_fkey(username)')
        .eq('id', replyToId)
        .single();

      if (replyMessage && replyMessage.sender) {
        messageData.reply_to = replyMessage.id;
        messageData.reply_to_content = replyMessage.content;
        messageData.reply_to_username = (replyMessage.sender as UserForSender).username;
      }
    }
    
    const { error } = await supabase
      .from('messages')
      .insert(messageData);
      
    if (error) {
      console.error('Error sending message:', error);
      return false;
    }
    // Bildirim sayacı artırımı Realtime aboneliğinde yapılacak.
    return true;
  },
  
  sendPrivateMessage: async (receiverId: string, content: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;
    
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error sending private message:', error);
      return false;
    }
    return true;
  },
  
  fetchGlobalMessages: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        is_event_message, 
        sender:users!messages_sender_id_fkey(
          id, username, avatar_url, is_admin, verified, is_online, last_seen
        )
      `)
      .is('receiver_id', null)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching messages:', error);
      set({ loading: false });
      return;
    }
    
    if (data) {
      const processedMessages = data.map(msg => {
        if (msg.is_event_message) {
          // Olayı tetikleyen gerçek kullanıcı bilgisi content'te olabilir veya cum_events'ten alınabilir.
          // Şimdilik sabit sistem göndericisi kullanalım.
          // `VideoPlayer`da `cum_events` dinleyicisi mesaj içeriğini buna göre oluşturmalı.
          return {
            ...msg,
            sender: {
              id: msg.sender_id, // Gerçekte mesajı atan client'ın user ID'si (RLS için)
              username: SYSTEM_SENDER_USERNAME, // Ama gösterilecek isim bu olacak
              avatar_url: SYSTEM_SENDER_AVATAR,
              is_admin: false,
              verified: true,
              is_online: true,
              last_seen: msg.created_at
            }
          };
        }
        return msg;
      });
      set({ messages: processedMessages as Message[], loading: false });
    } else {
      set({ messages: [], loading: false });
    }
  },
  
  editMessage: async (messageId: string, content: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ content, edited: true, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) console.error('Error editing message:', error);
  },

  deleteMessage: async (messageId: string | null) => {
    const query = supabase.from('messages');
    if (messageId === null) {
      await query.delete().is('receiver_id', null).eq('is_event_message', false); // Sadece kullanıcı mesajlarını temizle
      await query.delete().is('receiver_id', null).eq('is_event_message', true); // Sonra event mesajlarını
    } else {
      await query.delete().eq('id', messageId);
    }
  },
  
  subscribeToMessages: () => {
    const messagesSubscriptionKey = 'messages-global-subscription-v2'; // Kanal adını benzersiz yap
    const messageChannel = supabase.channel(messagesSubscriptionKey);
    
    messageChannel
      .on<Database['public']['Tables']['messages']['Row']>(
        'postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // filter: 'receiver_id=is.null' // Filtreyi client tarafında yapalım
        }, 
        async (payload) => {
          const newMessage = payload.new;

          if (newMessage.receiver_id === null) { // Sadece global mesajları işle
            console.log('New global message via Realtime:', newMessage);

            let processedMessage: Message;

            if (newMessage.is_event_message) {
              // Event mesajı ise, `sender` objesini sistem olarak ayarla.
              // Content'in içinde orijinal kullanıcı adı zaten var (`VideoPlayer` tarafından eklendi).
              processedMessage = {
                ...newMessage,
                sender: {
                  id: newMessage.sender_id, // Gerçekte bu mesajı atan client'ın ID'si
                  username: SYSTEM_SENDER_USERNAME,
                  avatar_url: SYSTEM_SENDER_AVATAR,
                  is_admin: false,
                  verified: true,
                  is_online: true,
                  last_seen: newMessage.created_at
                }
              };
              get().incrementUnreadEventNotifications();
            } else if (newMessage.sender_id) {
              // Normal kullanıcı mesajı, gönderici bilgilerini çek
              const { data: userSenderData, error: userError } = await supabase
                .from('users')
                .select('id, username, avatar_url, is_admin, verified, is_online, last_seen')
                .eq('id', newMessage.sender_id)
                .single();
              
              processedMessage = {
                ...newMessage,
                sender: userError ? undefined : userSenderData
              };
            } else {
              // sender_id null ve event mesajı değilse (beklenmedik durum)
              processedMessage = { ...newMessage, sender: undefined };
            }
            
            set(state => ({ messages: [...state.messages, processedMessage] }));
          }
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') console.log(`Successfully subscribed to ${messagesSubscriptionKey}`);
         else if (err) console.error(`Error in ${messagesSubscriptionKey} subscription:`, err);
         else console.log(`Subscription status for ${messagesSubscriptionKey}: ${status}`);
      });
      
    return () => {
      console.log(`Unsubscribing from ${messagesSubscriptionKey}`);
      supabase.removeChannel(messageChannel).catch(error => console.error(`Error unsubscribing from ${messagesSubscriptionKey}:`, error));
    };
  }
}));