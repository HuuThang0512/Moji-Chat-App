import React, { useState } from 'react'
import { Send } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import type { Conversation } from '@/types/chat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  selectedConvo: Conversation;
}

const MAX_LENGTH = 5000;

const MessageInput = ({ selectedConvo }: MessageInputProps) => {
  const { user } = useAuthStore();
  const { sendDirectMessage, sendGroupMessage } = useChatStore();
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const sendMessage = async () => {
    const content = value.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      // Chỉ coi là nhóm khi type === "group"; mọi trường hợp khác đều gửi tin riêng.
      if (selectedConvo.type === "group") {
        await sendGroupMessage(selectedConvo._id, content);
      } else {
        const otherUser = (selectedConvo.participants ?? []).find(
          (p) => p._id.toString() !== user._id.toString()
        );
        if (!otherUser) return;
        await sendDirectMessage(otherUser._id.toString(), content, undefined, selectedConvo._id);
      }
      // Chỉ xoá ô nhập khi gửi thành công, để nội dung không bị mất nếu lỗi mạng.
      setValue("");
    } catch {
      // Store đã hiện toast lỗi rồi.
    } finally {
      setSending(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 min-h-14 bg-background">
      <div className="flex-1 relative">
        <Input
          onKeyDown={handleKeyDown}
          value={value}
          maxLength={MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nhập tin nhắn..."
          aria-label="Nội dung tin nhắn"
          className="pr-12 h-9 border-border/50 focus:border-primary/50 transition-smooth resize-none"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <EmojiPicker onChange={(emoji) => setValue((prev) => (prev + emoji).slice(0, MAX_LENGTH))} />
        </div>
      </div>

      <Button
        onClick={sendMessage}
        disabled={!value.trim() || sending}
        size="lg"
        aria-label="Gửi tin nhắn"
        className="bg-gradient-chat hover:scale-105 hover:shadow-glow transition-smooth cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Send className="size-4 text-white" />
      </Button>
    </div>
  )
}

export default MessageInput
