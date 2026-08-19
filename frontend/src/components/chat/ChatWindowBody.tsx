import { useMemo } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component';
import { useChatStore } from '@/stores/useChatStore';
import ChatWelcomeScreen from './ChatWelcomeScreen';
import MessageItem from './MessageItem';

const ChatWindowBody = () => {
  const { activeConversationId, conversations, messages: allMessages, fetchMessages } = useChatStore();

  const entry = activeConversationId ? allMessages[activeConversationId] : undefined;
  const messages = useMemo(() => entry?.items ?? [], [entry?.items]);
  const hasMore = entry?.hasMore ?? false;
  const selectedConvo = conversations.find(convo => convo._id === activeConversationId);

  /**
   * Container dùng flex-col-reverse nên phần tử đầu mảng nằm ở đáy màn hình.
   * messages được lưu theo thứ tự cũ -> mới, vì vậy phải đảo lại khi hiển thị.
   */
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Cuộc trò chuyện được coi là đã đọc khi có ít nhất một người khác nằm trong seenBy.
  const lastMessageStatus = (selectedConvo?.seenBy?.length ?? 0) > 0 ? "seen" : "delivered";

  const fetchMoreMessages = () => {
    if (!activeConversationId) return;
    // Lỗi đã được store xử lý và thông báo, ở đây không cần bắt lại.
    fetchMessages(activeConversationId, { loadMore: true });
  };

  if (!selectedConvo) return <ChatWelcomeScreen />;

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-muted-foreground">
        Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-primary-foreground p-4">
      {/*
        flex-1 + min-h-0 là bắt buộc: thiếu flex-1 thì vùng cuộn chỉ cao bằng nội
        dung và bị dồn lên mép trên, thay vì bám đáy như cửa sổ chat thường thấy.
      */}
      <div
        id="scrollableDiv"
        className="beautiful-scrollbar flex min-h-0 min-w-0 max-w-full flex-1 flex-col-reverse overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
      >
        <InfiniteScroll
          dataLength={messages.length}
          next={fetchMoreMessages}
          hasMore={hasMore}
          scrollableTarget="scrollableDiv"
          inverse={true}
          loader={
            <div className="py-2 text-center text-xs text-muted-foreground">Đang tải tin nhắn cũ hơn...</div>
          }
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          {reversedMessages.map((message, index) => (
            <MessageItem
              key={message._id}
              message={message}
              index={index}
              messages={reversedMessages}
              selectedConvo={selectedConvo}
              lastMessageStatus={lastMessageStatus}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  )
}

export default ChatWindowBody
