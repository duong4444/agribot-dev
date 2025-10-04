"use client";

import React from 'react';
import { Bot, User } from 'lucide-react';
import { MessageContent } from '@/components/ui/message-content';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { Message } from './useChat';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading,
  messagesEndRef 
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scroll-smooth min-h-0">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Chào mừng bạn đến với AgriBot!</p>
          <p className="text-sm">Hãy bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn.</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg break-words ${
                message.type === 'user'
                  ? 'bg-agri-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'assistant' && (
                  <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                {message.type === 'user' && (
                  <User className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <MessageContent 
                    content={message.content} 
                    type={message.type}
                    intent={message.intent}
                    confidence={message.confidence}
                    responseTime={message.responseTime}
                  />
                  <p className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
      
      {isLoading && <TypingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

