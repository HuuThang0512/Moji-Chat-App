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

  const isGroup = chat.type === "group";
  const participants = chat.participants ?? [];

  if (!isGroup) {
    const otherUsers = participants.filter((p) => p._id !== user?._id);
    otherUser = otherUsers.length > 0 ? otherUsers[0] : null;
    if (!user || !otherUser) {
      return (
        <header className="sticky top-0 z-10 flex items-center px-4 py-2 bg-background">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="-ml-1 text-foreground"></SidebarTrigger>
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <span className="text-sm text-muted-foreground">Conversation unavailable</span>
          </div>
        </header>
      );
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center px-4 py-2 bg-background">
      <div className="flex items-center gap-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground"></SidebarTrigger>
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <div className="p-2 w-full flex items-center gap-3">
          {/* avatar */}
          <div className="relative inline-block">
            {isGroup ? (
              <GroupChatAvatar participants={participants} type="sidebar" />
            ) : (
              <>
                <UserAvatar name={otherUser?.displayName ?? "Moji"} avatarUrl={otherUser?.avatarUrl ?? undefined} type="sidebar" />
                <StatusBadge status={onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"} />
              </>
            )}
          </div>
          {/* name */}
          <h2 className="font-semibold text-foreground truncate">{isGroup ? chat.group?.name ?? "Group Chat" : otherUser?.displayName ?? "Moji"}</h2>
        </div>
      </div>
    </header>
  )
}

export default ChatWindowHeader
