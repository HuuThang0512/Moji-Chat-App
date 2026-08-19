import { useChatStore } from '@/stores/useChatStore'
import GroupChatCard from './GroupChatCard'
import EmptyListHint from './EmptyListHint'

const GroupChatList = () => {
  const { conversations } = useChatStore();

  const groupConversations = (conversations ?? []).filter(
    (conversation) => conversation.type === 'group'
  );

  // Danh sách rỗng vẫn phải hiện chữ, nếu không thì dưới nhãn nhóm chỉ là một
  // vùng trắng và người dùng không biết mình chưa có nhóm hay app lỗi.
  if (groupConversations.length === 0) {
    return <EmptyListHint>Chưa có nhóm chat nào</EmptyListHint>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">{groupConversations.map((convo) => { return <GroupChatCard key={convo._id} convo={convo} /> })}</div>
  )
}

export default GroupChatList
