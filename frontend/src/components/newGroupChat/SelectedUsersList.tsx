import React from 'react'
import type { Friend } from '@/types/user';
import UserAvatar from '../chat/UserAvatar';
import { X } from 'lucide-react';

interface SelectedUsersListProps {
  invitedUsers: Friend[];
  onRemove: (user: Friend) => void;
}

const SelectedUsersList = ({ invitedUsers, onRemove }: SelectedUsersListProps) => {
  if (invitedUsers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2">

      {invitedUsers.map((user) => (
        <div key={user._id} className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full">
          <UserAvatar type="chat" name={user.displayName} avatarUrl={user.avatarUrl} />
          <span className="font-medium">{user.displayName}</span>
          <button type="button" className="ml-auto" onClick={() => onRemove(user)}>
            <X className="size-3 cursor-pointer hover:text-destructive" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default SelectedUsersList