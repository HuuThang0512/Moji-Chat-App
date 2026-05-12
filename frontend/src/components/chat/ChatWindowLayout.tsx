import { useChatStore } from '@/stores/useChatStore';
import React,{ useEffect } from 'react'
import ChatWelcomeScreen from './ChatWelcomeScreen';
import ChatWindowSkeleton from './ChatWindowSkeleton';
import { SidebarInset } from '../ui/sidebar';
import ChatWindowHeader from './ChatWindowHeader';
import ChatWindowBody from './ChatWindowBody';
import MessageInput from './MessageInput';

type Props = {}

const ChatWindowLayout = (props: Props) => {
  const { activeConversationId,conversations,messages,messagesLoading: loading,markAsSeen } = useChatStore();
  const selectedConvo = conversations.find(convo => convo._id === activeConversationId);

  useEffect(() => {
    if(!selectedConvo) return;

    const markSeen = async () => {
      try {
        await markAsSeen();
      } catch(error) {
        console.error("Error marking as seen",error);
      }
    }
    markSeen();
  }, [markAsSeen, selectedConvo]);
  if(!selectedConvo) {
    return <ChatWelcomeScreen />;
  }
  if(loading) {
    return <ChatWindowSkeleton />
  }

  return (
    <SidebarInset className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-sm shadow-md">
      {/* Header */ }
      <ChatWindowHeader chat={ selectedConvo } />

      {/* Body */ }
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-primary-foreground [scrollbar-gutter:stable]">
        <ChatWindowBody />
      </div>

      {/* Footer */ }
      <MessageInput selectedConvo={ selectedConvo } />
    </SidebarInset>

  )
}

export default ChatWindowLayout