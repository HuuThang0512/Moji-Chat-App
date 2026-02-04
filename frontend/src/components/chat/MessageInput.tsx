import React, { useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore';
import type { Conversation } from '@/types/chat';
import { Button } from '../ui/button';
import { ImagePlus, Send } from 'lucide-react';
import { Input } from '../ui/input';
import EmojiPicker from './EmojiPicker';
import { toast } from 'sonner';
import { useChatStore } from '@/stores/useChatStore';

interface MessageInputProps {
  selectedConvo: Conversation;
}

const MessageInput = (props: MessageInputProps) => {
  const { selectedConvo } = props;
  const { user } = useAuthStore();
  const {sendDirectMessage} = useChatStore();
  const {sendGroupMessage} = useChatStore();
  const [value, setValue] = useState("");

  if (!user) return null;

  // Hàm xử lý gửi tin nhắn
  const sendMessage = async () => {
    if (!value.trim()) return;
    const currentValue = value;
    setValue("");
    try {
      // Tin nhắn riêng
        if (selectedConvo.type === "direct") {
          const participants = selectedConvo.participants;
          const otherUser = participants.filter(p => p._id.toString() !== user._id.toString())[0];
          if (!otherUser) return;
          const otherUserId = otherUser._id.toString();
          await sendDirectMessage(otherUserId, currentValue, undefined, selectedConvo._id);
        } else {
          // Tin nhắn trong nhóm
          await sendGroupMessage(selectedConvo._id, currentValue);
        }
    } catch (error) {
      console.error("Error sending message", error);
      toast.error("Failed to send message");
    } 
  }

  // Xử lý gửi tin nhắn khi người dùng bấm enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 min-h-[56px] bg-background">
      <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-smooth">
        <ImagePlus className="size-4" />
      </Button>
      <div className="flex-1 relative ">
        <Input onKeyPress={handleKeyDown} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type a message..." className="pr-20 h-9 bg-white border-border/50 focus:border-primary/50 transition-smooth resize-none" />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="size-8 hover:bg-primary/10 transition-smooth">
            <div>
              {/* emoji picker */}
              <EmojiPicker onChange={(emoji) => setValue(value + emoji)} />
            </div>
          </Button>
        </div>
      </div>
        {/* Sent message button*/}
        <Button
        onClick={sendMessage}
        className="bg-gradient-chat hover:scale-105 hover:shadow-glow transition-smooth cursor-pointer" disabled={!value.trim()} size="lg" ><Send className="size-4 text-white" /></Button> 
    </div>
  )
}

export default MessageInput