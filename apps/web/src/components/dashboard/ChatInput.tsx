"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  isLoading,
  placeholder = "Nhập câu hỏi về nông nghiệp..."
}) => {
  return (
    <div className="border-t bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 flex-shrink-0">
      <div className="flex space-x-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 border-gray-300 dark:border-gray-600 focus:border-agri-green-500 focus:ring-agri-green-500"
        />
        <Button
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="bg-agri-green-600 hover:bg-agri-green-700 px-4"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

