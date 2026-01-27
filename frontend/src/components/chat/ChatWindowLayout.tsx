import { useChatStore } from '@/stores/useChatStore';
import React from 'react'
import ChatWelcomeScreen from './ChatWelcomeScreen';
import ChatWindowSkeleton from './ChatWindowSkeleton';
import { SidebarInset } from '../ui/sidebar';
import ChatWindowHeader from './ChatWindowHeader';
import ChatWindowBody from './ChatWindowBody';
import MessageInput from './MessageInput';

type Props = {}

const ChatWindowLayout = (props: Props) => {
  const { activeConversationId, conversations, messages, messagesLoading: loading } = useChatStore();
  const selectedConvo = conversations.find(convo => convo._id === activeConversationId);
  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }
  if (loading) {
    return <ChatWindowSkeleton />
  }

  return (
    <SidebarInset className="flex h-full flex-col flex-1 overflow-hidden rounded-sm shadow-md">
      {/* Header */}
      <ChatWindowHeader />

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-primary-foreground"><ChatWindowBody /></div>

      {/* Footer */}
      <MessageInput />
    </SidebarInset>

  )
}

export default ChatWindowLayout