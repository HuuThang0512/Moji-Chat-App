/** Set by GET /users/search for the current viewer */
export type FriendRelationship =
  | "none"
  | "friends"
  | "request_sent"
  | "request_received"
  | "self";

export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  /** Rỗng nghĩa là chưa xác minh email - dùng để quyết định hiện banner nhắc. */
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  relationship?: FriendRelationship;
}

export interface Friend {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface FriendRequest {
  _id: string;
  from?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  },
  to?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }
  message?: string;
  createdAt: string;
  updatedAt: string;
}
