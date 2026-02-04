import { useThemeStore } from '@/stores/useThemeStore';
import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Smile } from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface EmojiPickerProps {
  onChange(emoji: any): void;
}

const EmojiPicker = (props: EmojiPickerProps) => {
  const { onChange } = props;
  const {isDark} = useThemeStore()

  return (
    <Popover>
      <PopoverTrigger className='cursor-pointer'>
        <Smile className='size-4' />
      </PopoverTrigger>

      <PopoverContent side="right" sideOffset={40} className="bg-transparent shadow-none boder-none drop-shadow-none mb-12">
        <Picker data={data} onEmojiSelect={(emoji: any) => onChange(emoji.native)} theme={isDark ? 'dark' : 'light'} />
      </PopoverContent>
    </Popover>
  )
}

export default EmojiPicker