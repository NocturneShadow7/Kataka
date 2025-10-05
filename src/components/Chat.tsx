import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string; role: string };
}

interface Conversation {
  id: string;
  client_id: string;
  last_message_at: string;
  client?: { full_name: string };
  last_message?: {
    content: string;
    sender_id: string;
  };
  unread_count?: number;
}

interface ChatProps {
  isAdmin?: boolean;
}

export function Chat({ isAdmin = false }: ChatProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationActive, setConversationActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [audio] = useState(new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS57OihUBELTKXh8LZhGwU7k9bywn0sBS18zu7aoE4PC1Gg4O+2YhsGPJLU8sByJQUtgc3y2Yk3Bxlnu+znolARDEyl4fC2YRsFO5PW8sJ9LAUufM7u2qBODwtRoODvtmIbBjyS1PLAciUFLYHN8tmJNwcZZ7vs56JQEQ=='));

  useEffect(() => {
    if (ouvert) {
      chargerConversations();
      requestNotificationPermission();
    }
  }, [ouvert]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (conversationActive) {
      chargerMessages(conversationActive);
      marquerMessagesCommeLus(conversationActive);
    } else if (isAdmin && ouvert) {
      chargerConversations();
    }
  }, [conversationActive]);

  useEffect(() => {
    if (!conversationActive) return;

    const channel = supabase
      .channel(`messages:${conversationActive}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationActive}`,
        },
        async (payload) => {
          const nouveauMsg = payload.new as Message;

          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', nouveauMsg.sender_id)
            .single();

          nouveauMsg.sender = senderData;

          setMessages((prev) => [...prev, nouveauMsg]);

          if (nouveauMsg.sender_id !== user?.id) {
            marquerMessagesCommeLus(conversationActive);

            // Play notification sound
            audio.play().catch(() => {});

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(nouveauMsg.sender?.full_name || 'Nouveau message', {
                body: nouveauMsg.content,
                icon: '/favicon.ico',
                tag: nouveauMsg.conversation_id,
              });
            }
          }

          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationActive, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const chargerConversations = async () => {
    if (isAdmin) {
      const { data: convsData, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement conversations:', error);
        setChargement(false);
        return;
      }

      if (convsData) {
        const conversationsAvecClients = await Promise.all(
          convsData.map(async (conv) => {
            const { data: clientData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', conv.client_id)
              .maybeSingle();

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', user?.id);

            return {
              ...conv,
              client: clientData,
              last_message: lastMsg,
              unread_count: count || 0
            };
          })
        );
        setConversations(conversationsAvecClients);
      }
    } else {
      let { data: conv, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('client_id', user?.id)
        .maybeSingle();

      if (!conv && !error) {
        const { data: nouvelleConv, error: erreurCreation } = await supabase
          .from('conversations')
          .insert({ client_id: user?.id })
          .select()
          .single();

        if (nouvelleConv) {
          conv = nouvelleConv;
          setConversationActive(nouvelleConv.id);
        }
      }

      if (conv) {
        setConversations([conv]);
        setConversationActive(conv.id);
      }
    }
    setChargement(false);
  };

  const chargerMessages = async (conversationId: string) => {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur chargement messages:', error);
      return;
    }

    if (messagesData) {
      const messagesAvecSenders = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', msg.sender_id)
            .maybeSingle();

          return {
            ...msg,
            sender: senderData
          };
        })
      );
      setMessages(messagesAvecSenders);
    }
  };

  const marquerMessagesCommeLus = async (conversationId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user?.id)
      .eq('is_read', false);
  };

  const envoyerMessage = async () => {
    if (!nouveauMessage.trim() || !conversationActive) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationActive,
      sender_id: user?.id,
      content: nouveauMessage.trim(),
    });

    if (error) {
      alert('Erreur lors de l\'envoi: ' + error.message);
      return;
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationActive);

    setNouveauMessage('');
  };

  const messagesNonLus = isAdmin
    ? conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)
    : messages.filter((m) => !m.is_read && m.sender_id !== user?.id).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <MessageSquare className="w-6 h-6" />
        {messagesNonLus > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {messagesNonLus > 9 ? '9+' : messagesNonLus}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOuvert(false)}
          />
          <div className="fixed sm:absolute inset-4 sm:inset-auto sm:right-0 sm:mt-2 sm:w-[28rem] sm:h-[36rem] h-[calc(100vh-2rem)] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 p-3 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isAdmin && conversationActive && (
                  <button
                    onClick={() => setConversationActive(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Retour à la liste"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <MessageSquare className="w-5 h-5 text-green-400" />
                <h3 className="text-base sm:text-lg font-semibold text-white truncate max-w-[150px] sm:max-w-none">
                  {isAdmin && conversationActive
                    ? conversations.find((c) => c.id === conversationActive)?.client?.full_name || 'Client'
                    : isAdmin
                    ? 'Messages clients'
                    : 'Support'}
                </h3>
              </div>
              <button
                onClick={() => setOuvert(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {chargement ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Chargement...
              </div>
            ) : isAdmin && !conversationActive ? (
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    Aucune conversation
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {conversations.map((conv) => {
                      const hasUnread = (conv.unread_count || 0) > 0;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setConversationActive(conv.id)}
                          className={`w-full p-3 sm:p-4 text-left hover:bg-gray-800 transition-colors relative ${
                            hasUnread ? 'bg-gray-800/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-white">
                                {conv.client?.full_name || 'Client'}
                              </div>
                              {hasUnread && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(conv.last_message_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {conv.last_message && (
                            <div className="text-sm text-gray-400 truncate">
                              {conv.last_message.sender_id === user?.id && (
                                <span className="text-blue-400 mr-1">Vous:</span>
                              )}
                              {conv.last_message.content}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-8">
                      Aucun message. Commencez la conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const estMoi = msg.sender_id === user?.id;
                      const estAdmin = msg.sender?.role === 'admin';

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${estMoi ? 'justify-end' : 'justify-start'} mb-2`}
                        >
                          <div className="flex flex-col max-w-[75%] sm:max-w-xs lg:max-w-md">
                            {!estMoi && (
                              <div className="flex items-center gap-2 mb-1 px-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                                  {msg.sender?.full_name?.charAt(0) || 'A'}
                                </div>
                                <div className="text-xs font-medium text-gray-400">
                                  {msg.sender?.full_name}
                                  {estAdmin && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-500/30 rounded text-blue-300 text-[10px]">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            <div
                              className={`px-4 py-2.5 rounded-2xl shadow-md ${
                                estMoi
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                                  : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                              <p
                                className={`text-[10px] mt-1.5 ${
                                  estMoi ? 'text-blue-200' : 'text-gray-500'
                                }`}
                              >
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-gray-700 p-3 sm:p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nouveauMessage}
                      onChange={(e) => setNouveauMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && envoyerMessage()}
                      placeholder="Écrivez votre message..."
                      className="flex-1 px-3 py-2 text-sm sm:text-base bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={envoyerMessage}
                      disabled={!nouveauMessage.trim()}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
