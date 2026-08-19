import { useChatStore } from '@/stores/useChatStore'
import DirectMessageCard from './DirectMessageCard';
import EmptyListHint from './EmptyListHint';

const DirectMessageList = () => {
  const { conversations, activeConversationId } = useChatStore();

  const directConversations = (conversations ?? []).filter(
    (conversation) =>
      conversation.type !== "group" &&
      (conversation.participants?.length ?? 0) > 0 &&
      (!!conversation.lastMessage || conversation._id === activeConversationId)
  );

  // Xem chú thích trong EmptyListHint về lý do không trả về rỗng.
  if (directConversations.length === 0) {
    return <EmptyListHint>Chưa có cuộc trò chuyện nào</EmptyListHint>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">{directConversations.map((convo) => { return <DirectMessageCard key={convo._id} convo={convo} /> })}</div>
  )
}

export default DirectMessageList
