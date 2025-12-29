"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Message } from "./useChat";

interface ChatInterfaceProps {
  messages: Message[];
  inputMessage: string;
  setInputMessage: (value: string) => void;
  isLoading: boolean;
  loadingMessage?: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  inputMessage,
  setInputMessage,
  isLoading,
  loadingMessage,
  messagesEndRef,
  onSendMessage,
  onKeyPress,
}) => {
  return (
    <Card className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden shadow-xl border-gray-200 dark:border-gray-700">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 flex-shrink-0 py-3">
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 bg-agri-green-100 dark:bg-agri-green-900/30 rounded-lg">
            <MessageSquare className="h-4 w-4 text-agri-green-600 dark:text-agri-green-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">Chat với AgriBot</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
              • Trợ lý AI nông nghiệp
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={onSendMessage}
          onKeyPress={onKeyPress}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};
