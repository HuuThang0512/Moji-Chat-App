import React from 'react'
import { useChatStore } from '@/stores/useChatStore'
import GroupChatCard from './GroupChatCard'

const GroupChatList = () => {
  const { conversations, loading } = useChatStore();
  if (!conversations || conversations.length === 0) {
    return;
  }
  const groupConversations = conversations.filter(conversation => conversation.type === 'group');
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">{groupConversations.map((convo) => { return <GroupChatCard key={convo._id} convo={convo} /> })}</div>
  )
}

export default GroupChatList