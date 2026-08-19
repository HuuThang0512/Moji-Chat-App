import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { UserPlus } from 'lucide-react';
import type { User } from '@/types/user';
import { useFriendStore } from '@/stores/useFriendStore';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import axios from 'axios';
import SearchForm from '../addFriendModal/SearchForm';
import SendFriendRequestForm from '../addFriendModal/SendFriendRequestForm';

export interface IFormValues {
  username: string;
  message?: string;
}

const AddFriendModal = () => {
  const [isFound, setIsFound] = useState<boolean | null>(null);
  const [searchUser, setSearchUser] = useState<User>();
  const [searchedUsername, setSearchedUsername] = useState<string>('');
  const { loading, searchUserByUsername, addFriend } = useFriendStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<IFormValues>({
    defaultValues: {
      username: '',
      message: '',
    },
  })

  const usernameValue = watch("username")

  const handleSearch = handleSubmit(async (data) => {
    const username = data.username.trim();
    if(!username) return;
    setIsFound(null);
    setSearchedUsername(username);

    try {
      const foundUser = await searchUserByUsername(username);
      if(foundUser) {
        setIsFound(true);
        setSearchUser(foundUser);
      } else {
        setIsFound(false);
      }
    } catch(error) {
      console.error("Error searching user by username", error);
      setIsFound(false);
    }

  })

  const handleSend = handleSubmit(async (data) => {
    if(!searchUser) return;
    if (searchUser.relationship && searchUser.relationship !== "none") {
      return;
    }
    try {
      const resultMessage = await addFriend(searchUser._id, data.message?.trim());
      toast.success(resultMessage);
      handleCancel();
    } catch(error) {
      console.error("Error sending friend request", error);
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : undefined;
      toast.error(message ?? "Failed to send friend request");
    }
  })

  const handleCancel = () => {
    reset();
    setSearchedUsername('');
    setIsFound(null);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex justify-center items-center size-5 rounded-full hover:bg-sidebar-accent cursor-pointer z-10">
          <UserPlus className="size-4" />
          <span className="sr-only">Add Friend</span>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] border-none">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Tìm người dùng theo username rồi gửi lời mời kết bạn.
          </DialogDescription>
        </DialogHeader>
        { !isFound && <SearchForm register={ register } errors={ errors } loading={ loading } usernameValue={ usernameValue } isFound={ isFound } searchedUsername={ searchedUsername } onSubmit={ handleSearch } onCancel={ handleCancel } /> }
        { isFound && searchUser ? (
          <SendFriendRequestForm
            register={ register }
            loading={ loading }
            searchedUsername={ searchedUsername }
            relationship={ searchUser.relationship ?? "none" }
            onSubmit={ handleSend }
            onBack={ handleCancel }
          />
        ) : null }
      </DialogContent>
    </Dialog>
  )
}

export default AddFriendModal