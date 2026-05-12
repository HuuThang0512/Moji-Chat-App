import { useChatStore } from '@/stores/useChatStore';
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ChatWelcomeScreen from './ChatWelcomeScreen';
import MessageItem from './MessageItem';
import InfiniteScroll from 'react-infinite-scroll-component';
import { toast } from 'sonner';

const ChatWindowBody = () => {
  const { activeConversationId, conversations, messages: allMessages, fetchMessages } = useChatStore();
  const [lastMessageStatus, setLastMessageStatus] = useState<"delivered" | "seen">("delivered");

  /** messages sẽ có dạng sắp xếp các tin nhắn theo chiều về sau là tin nhắn mới nhất trước, khi load thêm thì các tin cũ hơn sẽ được đẩy về phía đầu của danh sách */
  const messages = allMessages[activeConversationId!]?.items ?? [];
  const selectedConvo = conversations.find(convo => convo._id === activeConversationId);
  const reverseMessages = [...messages].reverse();
  const hasMore = allMessages[activeConversationId!]?.hasMore ?? false;

  // ref
  const containerRef = useRef<HTMLDivElement>(null);
  /**  End block ref to scroll to bottom of conversation when open */
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const keyScrollStorage = `chat-scroll-${activeConversationId}`;

  // Handle scroll to bottom of conversation when first open
  useLayoutEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeConversationId]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const raw = sessionStorage.getItem(keyScrollStorage);
    if (!raw) return;
    let scrollTop: number | undefined;
    try {
      const parsed = JSON.parse(raw) as { scrollTop?: number };
      scrollTop = parsed.scrollTop;
    } catch {
      return;
    }
    if (typeof scrollTop !== "number" || Number.isNaN(scrollTop)) return;
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      containerRef.current.scrollTop = scrollTop!;
    });
  }, [activeConversationId, keyScrollStorage]);

  useEffect(() => {
    const lastMessage = selectedConvo?.lastMessage;
    if(!lastMessage) return;

    const seenBy = selectedConvo?.seenBy ?? [];

    setLastMessageStatus(seenBy.length > 0 ? "seen" : "delivered");
  }, [selectedConvo]);

  const fetchMoreMessages = async () => {
    if (!activeConversationId) return;
    try {
      await fetchMessages(activeConversationId);
    } catch {
      toast.error("Failed to fetch more messages");
    }
  }

  /** Hàm để lưu vị trị cuộn hiện tại vào session storage */
  const handleScrollSave = () => {
    const container = containerRef.current;
    if(!container) return;
    sessionStorage.setItem(keyScrollStorage, JSON.stringify({
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
    }));
  }

  if(!selectedConvo) return <ChatWelcomeScreen />;
  if(!messages?.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">There are no messages in this conversation</div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-primary-foreground p-4">
      <div
        ref={ containerRef }
        id="scrollableDiv"
        className="beautiful-scrollbar flex min-h-0 min-w-0 max-w-full flex-col-reverse overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
      >
        <div ref={ messagesEndRef }></div>
        <InfiniteScroll
          dataLength={messages.length}
          next={fetchMoreMessages}
          hasMore={hasMore}
          scrollableTarget="scrollableDiv"
          inverse={true}
          onScroll={handleScrollSave}
          loader={<div>Loading...</div>}
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          { reverseMessages.map((message, index) => (
            <MessageItem key={ message._id } message={ message } index={ index } messages={ reverseMessages } selectedConvo={ selectedConvo } lastMessageStatus={ lastMessageStatus } />
          )) }
        </InfiniteScroll>

      </div>
    </div>
  )
}

export default ChatWindowBody