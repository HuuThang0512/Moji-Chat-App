import type { User } from '@/types/user';
import UserAvatar from '../chat/UserAvatar';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useSocketStore } from '@/stores/useSocketStore';

interface ProfileCardProps {
  user: User | null;
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  const { onlineUsers } = useSocketStore()
  const isOnline = Boolean(user && onlineUsers.includes(user._id))
  if(!user) return null;

  const bio = user.bio || "Will code for food";

  return (
    <Card className="overflow-hidden p-0 h-52 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
      <CardContent className="mt-20 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <div>
          <UserAvatar
            type="profile"
            name={ user.displayName }
            avatarUrl={ user.avatarUrl ?? undefined }
            className="ring-4 ring-white shadow-lg"
          />
          {/* todo: avatar uploader */ }
        </div>

        {/* user info */ }
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{ user.displayName }</h1>

          { bio && <p className="text-white/70 text-sm mt-2 max-w-lg line-clamp-2">{ bio }</p> }
        </div>
        {/* status */ }
        <Badge
          className={cn(
            "flex items-center gap-1 capitalize",
            isOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
          )}
        >
          <div className={cn("size-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-slate-500")} />
          {isOnline ? "online" : "offline"}
        </Badge>
      </CardContent>
    </Card>
  )
}

export default ProfileCard
