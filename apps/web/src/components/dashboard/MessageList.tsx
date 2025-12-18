"use client";

import React from "react";
import { Bot, User } from "lucide-react";
import { MessageContent } from "@/components/ui/message-content";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { Message } from "./useChat";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  messagesEndRef,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth min-h-0 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="p-6 bg-gradient-to-br from-agri-green-100 to-emerald-100 dark:from-agri-green-900/20 dark:to-emerald-900/20 rounded-2xl mb-4 shadow-lg">
            <Bot className="h-16 w-16 mx-auto text-agri-green-600 dark:text-agri-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Chào mừng bạn đến với AgriBot!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md">
            Tôi là trợ lý AI chuyên về nông nghiệp. Hãy bắt đầu cuộc trò chuyện
            bằng cách gửi tin nhắn của bạn.
          </p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl break-words shadow-md hover:shadow-lg transition-all duration-200 ${
                message.type === "user"
                  ? "bg-gradient-to-br from-agri-green-600 to-agri-green-700 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {message.type === "assistant" && (
                  <div className="p-1.5 bg-agri-green-100 dark:bg-agri-green-900/30 rounded-lg flex-shrink-0">
                    <Bot className="h-4 w-4 text-agri-green-600 dark:text-agri-green-400" />
                  </div>
                )}
                {message.type === "user" && (
                  <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <MessageContent
                    content={message.content}
                    type={message.type}
                    intent={message.intent}
                    confidence={message.confidence}
                    responseTime={message.responseTime}
                  />
                  <p
                    className={`text-xs mt-2 ${
                      message.type === "user"
                        ? "opacity-80"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
