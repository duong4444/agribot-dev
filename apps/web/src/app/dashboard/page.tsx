"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { 
  DashboardHeader, 
  ChatInterface, 
  DashboardSidebar,
  useChat
} from '@/components/dashboard';

const Dashboard = () => {
  const { data: session } = useSession();
  const {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
  } = useChat();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader userName={session?.user?.name} />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <ChatInterface 
                messages={messages}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                isLoading={isLoading}
                messagesEndRef={messagesEndRef}
                onSendMessage={sendMessage}
                onKeyPress={handleKeyPress}
              />
            </div>

            {/* Sidebar */}
            <DashboardSidebar />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;