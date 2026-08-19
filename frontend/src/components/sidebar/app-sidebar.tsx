"use client"

import * as React from "react"
import {
  Moon,
  Sun,
} from "lucide-react"

import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Switch } from "../ui/switch"
import CreateNewChat from "../chat/CreateNewChat"
import NewGroupChatModal from "../chat/NewGroupChatModal"
import GroupChatList from "../chat/GroupChatList"
import AddFriendModal from "../chat/AddFriendModal"
import DirectMessageList from "../chat/DirectMessageList"
import { useThemeStore } from "@/stores/useThemeStore"
import { useAuthStore } from "@/stores/useAuthStore"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isDark, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();


  return (
    <Sidebar variant="inset" {...props}>
      {/*
        Header.
        Trên điện thoại sidebar là một sheet dán sát mép màn hình, nên header
        cũng phải tràn sát mép: giữ padding và bo góc của bản desktop ở đây làm
        khối gradient lọt thỏm bên trong, lệch tông với phần còn lại.
      */}
      <SidebarHeader className="p-0 md:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="bg-gradient-primary h-14 rounded-none md:h-12 md:rounded-md"
            >
              <a href="#">
                <div className="flex w-full items-center justify-between px-4 md:px-2">
                  <h1 className="text-xl font-bold text-white">Moji</h1>
                  <div className="flex items-center gap-2">
                    <Sun className="size-4 text-white/80" />
                    <Switch checked={isDark} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-background/80" />
                    <Moon className="size-4 text-white/80" />
                  </div>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="beautiful-scrollbar">
        {/* New chat */}
        <SidebarGroup>
          <SidebarGroupContent>
            <CreateNewChat />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group chats */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase">Group chats</SidebarGroupLabel>
          <NewGroupChatModal />
          <SidebarGroupContent>
            <GroupChatList />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Direct chats */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase">Friends</SidebarGroupLabel>
          <SidebarGroupAction title="Add friend" className="cursor-pointer">
            <AddFriendModal />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <DirectMessageList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
