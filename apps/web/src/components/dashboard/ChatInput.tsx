"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

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
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 p-4 sm:p-5 flex-shrink-0 shadow-inner">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 border-gray-300 dark:border-gray-600 focus:border-agri-green-500 focus:ring-agri-green-500 rounded-xl shadow-sm bg-white dark:bg-gray-900 h-11 px-4"
        />
        <Button
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="bg-gradient-to-r from-agri-green-600 to-agri-green-700 hover:from-agri-green-700 hover:to-agri-green-800 shadow-md hover:shadow-lg transition-all duration-200 rounded-xl px-5 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};

