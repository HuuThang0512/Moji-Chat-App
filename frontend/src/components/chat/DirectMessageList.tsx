import { useChatStore } from '@/stores/useChatStore'
import DirectMessageCard from './DirectMessageCard';

const DirectMessageList = () => {
  const { conversations, activeConversationId } = useChatStore();
  if (!conversations || conversations.length === 0) {
    return;
  }
  const directConversations = conversations.filter(
    (conversation) =>
      conversation.type !== "group" &&
      (conversation.participants?.length ?? 0) > 0 &&
      (!!conversation.lastMessage || conversation._id === activeConversationId)
  );

  if (directConversations.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">{directConversations.map((convo) => { return <DirectMessageCard key={convo._id} convo={convo} /> })}</div>
  )
}

export default DirectMessageList
