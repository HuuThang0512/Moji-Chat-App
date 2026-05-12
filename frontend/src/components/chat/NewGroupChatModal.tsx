import { useFriendStore } from "@/stores/useFriendStore";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "../ui/dialog";
import { SidebarGroupAction } from "../ui/sidebar";
import { Loader2, UserPlus, Users } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState } from "react";
import type { Friend } from "@/types/user";
import InviteSuggestionList from "../newGroupChat/InviteSuggestionList";
import SelectedUsersList from "../newGroupChat/SelectedUsersList";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";
import { Button } from "../ui/button";

const NewGroupChatModal = () => {
  const { friends, getFriends } = useFriendStore();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [invitedUsers, setInvitedUsers] = useState<Friend[]>([]);
  const { loading, createConversation } = useChatStore()

  const handleGetFriends = async () => {
    await getFriends();
  }

  const filteredFriends = friends.filter((friend) => friend.displayName.toLowerCase().includes(search.toLowerCase()) && !invitedUsers.some((u) => u._id === friend._id));

  const handleSelectFriend = (friend: Friend) => {
    setInvitedUsers([...invitedUsers, friend]);
    setSearch("");
  }

  const handleRemoveFriend = (friend: Friend) => {
    setInvitedUsers(invitedUsers.filter((u) => u._id !== friend._id));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      if(invitedUsers.length === 0) {
        toast.error("Please invite at least one member");
        return
      };
      await createConversation("group", invitedUsers.map((u) => u._id), groupName);
      setSearch("");
      setGroupName("");
      setInvitedUsers([]);
      toast.success("Group chat created successfully");
    } catch(error) {
      console.error("Error creating group chat", error);
    }
  }


  return (
    <Dialog
      onOpenChange={ (open) => {
        if(open) void handleGetFriends();
      } }
    >
      <SidebarGroupAction asChild title="Create new group chat" className="cursor-pointer">
        <DialogTrigger asChild>
          <button type="button">
            <Users className="size-4" />
            <span className="sr-only">Create new group chat</span>
          </button>
        </DialogTrigger>
      </SidebarGroupAction>
      <DialogContent className="border-none sm:max-w-[425px]" >
        <form className="space-y-4"
          onSubmit={ handleSubmit }>
          {/* group name */ }
          <div className="flex flex-col gap-2">
            <Label htmlFor="groupName" className="text-sm font-semibold">Group name</Label>
            <Input
              id="groupName"
              value={ groupName }
              placeholder="Enter group name here..."
              className="glass border-border/50 focus:border-primary/50 transition-smooth"
              onChange={ (e) => setGroupName(e.target.value) }
              required
            />
          </div>

          {/* invite members */ }
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite" className="text-sm font-semibold">Invite members</Label>
            <Input
              id="invite"
              value={ search }
              placeholder="Enter usernames here..."
              className="glass border-border/50 focus:border-primary/50 transition-smooth"
              onChange={ (e) => setSearch(e.target.value) }
            />

            {/* list friends suggestions */ }
            { search && filteredFriends.length > 0 && (
              <InviteSuggestionList filteredFriends={ filteredFriends } onSelect={ handleSelectFriend } />
            ) }


            {/* list invited users */ }
            { invitedUsers.length > 0 && (
              <SelectedUsersList invitedUsers={ invitedUsers } onRemove={ handleRemoveFriend } />
            ) }
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="flex-1 bg-gradient-chat text-white hover:opacity-90 transition-smooth"
              disabled={ loading }>
              { loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Creating...</> : <><UserPlus className="size-4 mr-2" /> Create</> }
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewGroupChatModal