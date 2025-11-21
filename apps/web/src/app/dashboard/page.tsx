"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardHeader, ChatInterface, DashboardSidebar, useChat } from '@/components/dashboard';

const Dashboard = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
    resetConversation,
    loadConversation,
    conversationId,
  } = useChat();

  const [sidebarKey, setSidebarKey] = React.useState(0);

  // Trigger sidebar refresh when conversationId changes
  React.useEffect(() => {
    if (conversationId) {
      setSidebarKey(prev => prev + 1);
    }
  }, [conversationId]);

  const handleSelectConversation = (conversationId: string) => {
    loadConversation(conversationId);
  };

  // Redirect new users without a farm to /farm
  React.useEffect(() => {
    if (session?.user) {
      const checkFarm = async () => {
        try {
          const res = await fetch('/api/farms');
          if (!res.ok) {
            // If 404 or any error, redirect to farm registration page
            router.replace('/farm');
          }
        } catch (e) {
          router.replace('/farm');
        }
      };
      checkFarm();
    }
  }, [session, router]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <DashboardHeader userName={session?.user?.name} />

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chat Interface - Takes more space on larger screens */}
            <div className="lg:col-span-8 xl:col-span-9">
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

            {/* Sidebar - Sticky on larger screens */}
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="lg:sticky lg:top-6">
                <DashboardSidebar 
                  key={sidebarKey}
                  onNewConversation={resetConversation}
                  onSelectConversation={handleSelectConversation}
                  currentConversationId={conversationId || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;