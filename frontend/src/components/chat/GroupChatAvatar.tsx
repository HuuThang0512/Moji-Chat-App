import type { Participant } from '@/types/chat';
import React from 'react'
import UserAvatar from './UserAvatar';
import { Ellipsis } from 'lucide-react';

interface GroupChatAvatarProps {
  participants: Participant[];
  type: "chat" | "sidebar"
}

const GroupChatAvatar = (props: GroupChatAvatarProps) => {
  const { participants, type } = props;
  const avatars = []
  const limit = Math.min(participants.length, 4);
  for (let i = 0; i < limit; i++) {
    const member = participants[i];
    avatars.push(<UserAvatar key={member._id} name={member.displayName} avatarUrl={member.avatarUrl ?? undefined} type={type} />);
  }
  return (
    <div className="relative -space-x-2 flex *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:ring-2">
      {avatars}
      {participants.length > limit && (
        <div className="flex items-center justify-center z-10 size-8 rounded-full bg-muted ring-2 ring-background text-muted-foreground">
          <Ellipsis className="size-4" />
        </div>
      )}
    </div>
  )
}

export default GroupChatAvatar