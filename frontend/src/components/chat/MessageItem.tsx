import { cn, formatMessageTime } from '@/lib/utils';
import type { Conversation, Message, Participant } from '@/types/chat';
import UserAvatar from './UserAvatar';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen"

}

const MessageItem = (props: MessageItemProps) => {
  const { message, index, messages, selectedConvo, lastMessageStatus } = props;
  const prev = index + 1 < messages.length ? messages[index + 1] : null;
  const isShowTime = index === 0 || message.senderId != prev?.senderId || new Date(message.createdAt).getTime() - new Date(prev?.createdAt || 0).getTime() > 300000 // 5 mins
  const isGroupBreak = isShowTime && message.senderId != prev?.senderId;
  const participant = (selectedConvo.participants ?? []).find(
    (p: Participant) => p._id.toString() === message.senderId.toString(),
  );

  return (
    <>

      <div
        className={ cn(
          "message-bounce flex min-w-0 gap-2",
          message.isOwn ? "justify-end" : "justify-start",
        ) }
      >
        {/* avatar */ }
        { !message.isOwn && (
          <div className="w-8">
            { isGroupBreak && (
              <UserAvatar
                type="chat"
                name={ participant?.displayName ?? "Moji" }
                avatarUrl={ participant?.avatarUrl ?? undefined } />
            ) }
          </div>
        ) }

        {/* message */ }
        <div
          className={ cn(
            "mt-1 flex min-w-0 max-w-[min(100%,20rem)] flex-col space-y-1 lg:max-w-md",
            message.isOwn ? "justify-end" : "justify-start",
          ) }
        >
          <Card className={ cn("p-3", message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received border-0") }>
            <p className="break-words text-sm leading-relaxed">{ message.content }</p>
          </Card>


          {/* seen/ delivered */ }
          { message.isOwn && message._id === selectedConvo.lastMessage?._id && (
            <Badge variant="outline" className={ cn("text-xs px-1 py-0.5 h-4 border-0", lastMessageStatus === "seen" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground") }>
              { lastMessageStatus }
            </Badge>
          ) }

        </div>
      </div>
      {/* time */ }
      { isShowTime && (
        <div className="flex w-full justify-center py-1">
          <span className="text-xs text-muted-foreground">
            { formatMessageTime(new Date(message.createdAt)) }
          </span>
        </div>
      ) }
    </>

  )
}

export default MessageItem