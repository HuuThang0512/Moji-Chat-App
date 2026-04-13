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
    if(!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView();
  }, [activeConversationId])

  // Handle scroll to saved when compoennt re-render by scroll
  useLayoutEffect(() => {
    const container = containerRef.current;
    const scrollSave = sessionStorage.getItem(keyScrollStorage);
    const {scrollTop} = JSON.parse(scrollSave || '{}');
    requestAnimationFrame(() => {
      if(!container) return;
      container.scrollTop = scrollTop;
    });
  })

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
    <div className="p-4 bg-primary-foreground h-full flex flex-col overflow-hidden">
      <div ref={ containerRef } id="scrollableDiv" className="flex flex-col-reverse overflow-y-auto overflow-x-hidden beatiful-scrollbar">
        <div ref={ messagesEndRef }></div>
        <InfiniteScroll
          dataLength={messages.length}
          next={fetchMoreMessages}
          hasMore={hasMore}
          scrollableTarget="scrollableDiv"
          inverse={true}
          onScroll={handleScrollSave}
          loader={<div>Loading...</div>}
          style={{ display: 'flex', flexDirection: 'column-reverse' }}
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