import type { Conversation } from '@/types/chat';
import React from 'react'
import ChatCard from './ChatCard'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore } from '@/stores/useChatStore'
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import UserAvatar from './UserAvatar';
import StatusBadge from './StatusBadge';
import UnreadCountBadge from './UnreadCountBadge';

interface DirectMessageCardProps {
  convo: Conversation;
}

const DirectMessageCard = (props: DirectMessageCardProps) => {
  const { convo } = props;
  const { user } = useAuthStore();
  const { activeConversationId, setActiveConversationId, messages } = useChatStore();

  if (!user) return null;

  const otherUser = convo.participants.find(p => p._id.toString() !== user._id.toString());
  if (!otherUser) return null;
  console.log(convo);
  const unreadCount = convo.unreadCount?.[user._id] ?? 0;
  const lastMessage = convo.lastMessage?.content ?? '';

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    if (!messages[id]) {
      // todo: fetch messages
    }
  }

  return (
    <ChatCard convoId={convo._id} name={otherUser.displayName ?? ""} timestamp={convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt) : undefined} isActive={activeConversationId === convo._id} onSelect={handleSelectConversation} unreadCount={unreadCount} leftSection={<>

      <UserAvatar name={otherUser.displayName ?? ""} avatarUrl={otherUser.avatarUrl ?? undefined} type="sidebar" />
      {/* todo: socketIO */}
      <StatusBadge status="offline" />
      {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
    </>} subTitle={<p className={cn("text-sm truncate", unreadCount > 0 ? "font medium text-foreground" : "text-muted-foreground")}>{lastMessage}</p>} />
  )
}

export default DirectMessageCard