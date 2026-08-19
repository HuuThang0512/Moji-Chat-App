import { useFriendStore } from '@/stores/useFriendStore';
import FriendRequestItem from './FriendRequestItem';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const ReceivedRequest = () => {
  const { acceptRequest, declineRequest, loading, receivedList } = useFriendStore();
  if(!receivedList || receivedList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven't received any friend requests yet.
      </p>
    )
  }

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
      toast.success("Friend request accepted");
    } catch(error) {
      console.error("Error accepting friend request", error);
    }
  }

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId);
      toast.success("Friend request declined");
    } catch(error) {
      console.error("Error declining friend request", error);
    }
  }

  return (
    <div className="space-y-3 mt-4">
      { receivedList.map((request) => (
        <FriendRequestItem key={ request._id } requestInfo={ request } actions={ <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={ () => handleAccept(request._id) } disabled={ loading }>Accept</Button><Button
            size="sm" variant="destructiveOutline" onClick={ () => handleDecline(request._id) } disabled={ loading }>Decline</Button>
        </div> } type="received" />
      )) }
    </div>
  )
}

export default ReceivedRequest
