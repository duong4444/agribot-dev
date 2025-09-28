"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MessageContent } from '@/components/ui/message-content';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  Leaf,
  LogOut,
  Settings,
  BarChart3
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  intent?: string;
  confidence?: number;
  responseTime?: number;
}

const Dashboard = () => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call actual API
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: currentMessage,
          conversationId: null, // Will create new conversation
        }),
      });

      console.log("response trả về từ BE: ",response);
      
      if (!response.ok) {
        throw new Error('Error dashboard page !');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: data.response.id,
        content: data.response.content,
        type: 'assistant',
        timestamp: new Date(data.response.createdAt),
        intent: data.response.intent,
        confidence: data.response.confidence,
        responseTime: data.response.responseTime,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback message on error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        type: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-2">
                  <Leaf className="h-8 w-8 text-agri-green-600" />
                  <span className="text-xl font-bold text-agri-green-800 dark:text-agri-green-400">
                    AgriBot
                  </span>
                </Link>
                <div className="hidden md:block">
                  <span className="text-sm text-gray-500">
                    Xin chào, {session?.user?.name}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Chat với AgriBot</span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
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
                            className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
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

                  {/* Input */}
                  <div className="border-t bg-gray-50 dark:bg-gray-800 p-4">
                    <div className="flex space-x-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập câu hỏi về nông nghiệp..."
                        disabled={isLoading}
                        className="flex-1 border-gray-300 dark:border-gray-600 focus:border-agri-green-500 focus:ring-agri-green-500"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
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
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thao tác nhanh</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Cuộc trò chuyện mới
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Xem báo cáo
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Cài đặt
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Conversations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cuộc trò chuyện gần đây</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 text-center py-4">
                    Chưa có cuộc trò chuyện nào
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;