import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useFriendStore } from "@/stores/useFriendStore";
import ReceivedRequest from "./ReceivedRequest";
import SentRequest from "./SentRequest";
import { Tabs, TabsTrigger, TabsList, TabsContent } from "../ui/tabs";

interface FriendRequestDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}



const FriendRequestDialog = ({ open, setOpen }: FriendRequestDialogProps) => {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const { getAllFriendRequests } = useFriendStore();

  useEffect(() => {
    if (!open) return;

    const loadRequests = async () => {
      try {
        await getAllFriendRequests();
      } catch(error) {
        console.error("Error loading friend requests", error);
      }
    }
    loadRequests();
  }, [open, getAllFriendRequests]);

  return (
    <Dialog open={ open } onOpenChange={ setOpen }>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Friend Requests</DialogTitle>
          <DialogDescription>
            Xem và xử lý các lời mời kết bạn đã nhận và đã gửi.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={ tab } onValueChange={ (value) => setTab(value as "received" | "sent") } className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>
          <TabsContent value="received">
            <ReceivedRequest />
          </TabsContent>
          <TabsContent value="sent">
            <SentRequest />
          </TabsContent>
        </Tabs>

      </DialogContent>

    </Dialog>
  )
}

export default FriendRequestDialog