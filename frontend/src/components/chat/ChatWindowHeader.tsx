import type { Conversation, Participant } from '@/types/chat'
import { useChatStore } from '@/stores/useChatStore'
import { SidebarTrigger } from '../ui/sidebar'
import { useAuthStore } from '@/stores/useAuthStore'
import { Separator } from '../ui/separator'
import UserAvatar from './UserAvatar'
import GroupChatAvatar from './GroupChatAvatar'
import StatusBadge from './StatusBadge'
import { useSocketStore } from '@/stores/useSocketStore'

const ChatWindowHeader = ({ chat }: { chat?: Conversation }) => {
  const { conversations, activeConversationId } = useChatStore();
  const { user } = useAuthStore();
  const { onlineUsers } = useSocketStore();
  let otherUser: Participant | null = null;

  chat = chat ?? conversations.find(c => c._id === activeConversationId);
  if (!chat) return (
    <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
      <SidebarTrigger className="-ml-1 text-foreground">
      </SidebarTrigger>
    </header >
  );

  if (chat.type === "direct") {
    const otherUsers = chat.participants.filter(p => p._id !== user?._id);
    otherUser = otherUsers.length > 0 ? otherUsers[0] : null;
    if (!user || !otherUser) return
  }

  return (
    <header className="sticky top-0 z-10 flex items-center px-4 py-2 bg-background">
      <div className="flex items-center gap-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground"></SidebarTrigger>
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <div className="p-2 w-full flex items-center gap-3">
          {/* avatar */}
          <div className="relative inline-block">
            {chat.type === "direct" ? <><UserAvatar name={otherUser?.displayName ?? "Moji"} avatarUrl={otherUser?.avatarUrl ?? undefined} type="sidebar" />
              {/* todo: socketIO */}
              <StatusBadge status={onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"} /></> : <GroupChatAvatar participants={chat.participants} type="sidebar" />}
          </div>
          {/* name */}
          <h2 className="font-semibold text-foreground truncate">{chat.type === "direct" ? otherUser?.displayName ?? "Moji" : chat.group?.name ?? "Group Chat"}</h2>
        </div>
      </div>
    </header>
  )
}

export default ChatWindowHeader
