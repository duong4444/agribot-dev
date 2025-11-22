"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardHeader, ChatInterface, DashboardSidebar, useChat } from '@/components/dashboard';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCheckingFarm, setIsCheckingFarm] = useState(true);
  const [hasFarm, setHasFarm] = useState(false);

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

  const [sidebarKey, setSidebarKey] = useState(0);

  // Trigger sidebar refresh when conversationId changes
  useEffect(() => {
    if (conversationId) {
      setSidebarKey(prev => prev + 1);
    }
  }, [conversationId]);

  const handleSelectConversation = (conversationId: string) => {
    loadConversation(conversationId);
  };

  // Check farm immediately when session is ready
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const checkFarm = async () => {
        try {
          const res = await fetch('/api/farms');
          if (res.ok) {
            setHasFarm(true);
          } else if (res.status === 404) {
            // No farm - redirect immediately
            router.replace('/farm');
            return; // Don't set isCheckingFarm to false
          }
        } catch (e) {
          console.error('Farm check error:', e);
          router.replace('/farm');
          return;
        } finally {
          setIsCheckingFarm(false);
        }
      };
      checkFarm();
    }
  }, [session, status, router]);

  // Show loading state while checking farm
  if (status === 'loading' || isCheckingFarm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-50 to-agri-green-50/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-agri-green-600" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Only render dashboard if farm exists
  if (!hasFarm) {
    return null; // Redirecting...
  }

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