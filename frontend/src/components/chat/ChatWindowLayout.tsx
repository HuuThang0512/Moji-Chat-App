import { useEffect } from 'react'
import { useChatStore } from '@/stores/useChatStore';
import ChatWelcomeScreen from './ChatWelcomeScreen';
import ChatWindowSkeleton from './ChatWindowSkeleton';
import { SidebarInset } from '../ui/sidebar';
import ChatWindowHeader from './ChatWindowHeader';
import ChatWindowBody from './ChatWindowBody';
import MessageInput from './MessageInput';

const ChatWindowLayout = () => {
  const { activeConversationId, conversations, messages, messagesLoading, markAsSeen } = useChatStore();
  const selectedConvo = conversations.find(convo => convo._id === activeConversationId);

  // Chỉ hiện skeleton ở lần tải đầu của cuộc trò chuyện. Nếu bám theo
  // messagesLoading nói chung thì mỗi lần cuộn lên tải thêm trang cũ, cả cửa
  // sổ chat sẽ nháy trắng.
  const isFirstLoad = Boolean(
    activeConversationId && messagesLoading && !messages[activeConversationId]
  );

  useEffect(() => {
    if (!activeConversationId) return;
    markAsSeen();
  }, [activeConversationId, markAsSeen]);

  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }

  if (isFirstLoad) {
    return <ChatWindowSkeleton />;
  }

  return (
    <SidebarInset className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-sm shadow-md">
      {/* Header */}
      <ChatWindowHeader chat={selectedConvo} />

      {/* Body - ChatWindowBody tự quản lý vùng cuộn, ở đây chỉ cần khung co giãn */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-primary-foreground">
        <ChatWindowBody />
      </div>

      {/* Footer */}
      <MessageInput selectedConvo={selectedConvo} />
    </SidebarInset>
  )
}

export default ChatWindowLayout
