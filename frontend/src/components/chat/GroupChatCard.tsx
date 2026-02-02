import React from 'react'
import type { Conversation } from '@/types/chat';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import ChatCard from './ChatCard';
import { cn } from '@/lib/utils';
import GroupChatAvatar from './GroupChatAvatar';
import UnreadCountBadge from './UnreadCountBadge';

interface GroupChatCardProps {
  convo: Conversation;
}

const GroupChatCard = (props: GroupChatCardProps) => {
  const { convo } = props;
  const { user } = useAuthStore();
  const { activeConversationId, setActiveConversationId, messages, fetchMessages } = useChatStore();

  if (!user) return null;

  const unreadCount = convo.unreadCount?.[user._id] ?? 0;
  const name = convo.group?.name ?? "";
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    if (!messages[id]) {
      await fetchMessages(id);
    }
  }


  return (
    <ChatCard convoId={convo._id} name={name} timestamp={convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt) : undefined} isActive={activeConversationId === convo._id} onSelect={handleSelectConversation} unreadCount={unreadCount} leftSection={<>{unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}<GroupChatAvatar participants={convo.participants} type="chat" /></>} subTitle={<p className={cn("text-sm truncate", unreadCount > 0 ? "font medium text-foreground" : "text-muted-foreground")}>{convo.participants.length} members</p>} />
  )
}

export default GroupChatCard