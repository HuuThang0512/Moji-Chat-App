import { useFriendStore } from '@/stores/useFriendStore';
import React from 'react'
import FriendRequestItem from './FriendRequestItem';

const SentRequest = () => {
  const { sentList } = useFriendStore();
  if(!sentList || sentList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven't sent any friend requests yet.
      </p>
    )
  }
  return (
    <div className="space-y-3 mt-4">
      { sentList.map((request) => (
        <FriendRequestItem key={ request._id } requestInfo={ request } actions={ <p className="text-muted-foreground">Waiting for response</p> } type="sent" />
      )) }
    </div>
  )
}

export default SentRequest;