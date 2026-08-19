import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface IUserAvatarProps {
  type: "sidebar" | "chat" | "profile";
  name: string;
  avatarUrl?: string | undefined;
  className?: string;
}

const UserAvatar = (props: IUserAvatarProps) => {
  const { type, avatarUrl, className } = props;
  const name = props.name || "Moji";

  const bgColor = !avatarUrl ? "bg-blue-500" : ""

  return (
    <Avatar className={cn(className ?? "", type == "sidebar" && "size-12 text-base", type == "chat" && "size-8 text-sm", type == "profile" && "size-24 text-3xl shadow-md")}>
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback className={`${bgColor} text-white font-semibold`}>{name.charAt(0)}</AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar
