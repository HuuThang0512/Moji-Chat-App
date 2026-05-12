import React from 'react'
import type { IFormValues } from '../chat/AddFriendModal';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { UserPlus } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import type { FriendRelationship } from '@/types/user';

interface SendRequestProps {
  register: UseFormRegister<IFormValues>;
  loading: boolean;
  searchedUsername: string;
  relationship?: FriendRelationship;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack?: () => void;
}

const relationshipHint = (r: FriendRelationship | undefined): string | null => {
  switch (r) {
    case "friends":
      return "You are already friends with this user. Open “Send new message” to chat.";
    case "request_sent":
      return "A friend request is already pending for this user.";
    case "request_received":
      return "This user already sent you a request. Open Friend Requests from your profile to accept or decline.";
    case "self":
      return "That username is yours.";
    default:
      return null;
  }
};

const SendFriendRequestForm = ({
  register,
  loading,
  searchedUsername,
  relationship = "none",
  onSubmit,
  onBack,
}: SendRequestProps) => {
  const canSend = relationship === "none";
  const hint = relationshipHint(relationship);

  return (
    <form
      onSubmit={ canSend ? onSubmit : (e) => e.preventDefault() }
      className="space-y-4"
    >
      <div className="flex flex-col gap-2">
        <span className="success-message">
          Found <span className="font-semibold">@{ searchedUsername }</span> successfully
        </span>

        { hint ? (
          <p className="text-sm text-muted-foreground rounded-md border border-border/60 bg-muted/30 p-3">
            { hint }
          </p>
        ) : null }

        { canSend ? (
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="message"
              className="text-sm font-semibold"
            >
              Giới thiệu
            </Label>
            <Textarea
              id="message"
              rows={ 3 }
              placeholder="Hello, can we be friends?..."
              className="glass border-border/50 focus:border-primary/50 transition-smooth resize-none"
              { ...register("message") }
            />
          </div>
        ) : null }

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="flex-1 glass hover:text-destructive"
            onClick={ onBack }
          >
            Back
          </Button>

          { canSend ? (
            <Button
              type="submit"
              disabled={ loading }
              className="flex-1 bg-gradient-chat text-white hover:opacity-90 transition-smooth"
            >
              { loading ? <span>Sending...</span> : <><UserPlus className="size-4 mr-2" /> Send</> }
            </Button>
          ) : null }
        </DialogFooter>
      </div>
    </form>
  )
}

export default SendFriendRequestForm