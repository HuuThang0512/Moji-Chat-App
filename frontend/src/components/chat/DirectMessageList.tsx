import React from 'react'
import { useChatStore } from '@/stores/useChatStore'
import DirectMessageCard from './DirectMessageCard';

const DirectMessageList = () => {
  const { conversations, messagesLoading: loading } = useChatStore();
  if (!conversations || conversations.length === 0) {
    return;
  }
  const directConversations = conversations.filter(conversation => conversation.type === 'direct');
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">{directConversations.map((convo) => { return <DirectMessageCard key={convo._id} convo={convo} /> })}</div>
  )
}

export default DirectMessageList
