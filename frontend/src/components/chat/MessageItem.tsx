import { cn, formatMessageTime } from '@/lib/utils';
import type { Conversation, Message, Participant } from '@/types/chat';
import React from 'react'
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
  const prev = messages[index - 1];
  const isGroupBreak = index === 0 || message.senderId != prev?.senderId || new Date(message.createdAt).getTime() - new Date(prev?.createdAt || 0).getTime() > 300000 // 5 mins
  const participant = selectedConvo.participants.find((p: Participant) => p._id.toString() === message.senderId.toString());

  return (
    <div className={cn("flex gap-2 message-bounce", message.isOwn ? "justify-end" : "justify-start")}>
      {/* avatar */}
      {!message.isOwn && (
        <div className="w-8">
          {isGroupBreak && (
            <UserAvatar
              type="chat"
              name={participant?.displayName ?? "Moji"}
              avatarUrl={participant?.avatarUrl ?? undefined} />
          )}
        </div>
      )}

      {/* message */}
      <div className={cn("max-w-xs lg:max-w-md space-y-1 flex flex-col", message.isOwn ? "justify-end" : "justify-start")}>
        <Card className={cn("p-3", message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received border-0")}>
          <p className="text-sm leading-relaxed wrap-break-words">{message.content}</p>
        </Card>

        {/* time */}
        {isGroupBreak && (
          <span className="text-xs text-muted-foreground px-1">
            {formatMessageTime(new Date(message.createdAt))}
          </span>
        )}

        {/* seen/ delivered */}
        {message.isOwn && message._id === selectedConvo.lastMessage?._id && (
          <Badge variant="outline" className={cn("text-xs px-1 py-0.5 h-4 border-0", lastMessageStatus === "seen" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
            {lastMessageStatus}
          </Badge>
        )}

      </div>
    </div>
  )
}

export default MessageItem