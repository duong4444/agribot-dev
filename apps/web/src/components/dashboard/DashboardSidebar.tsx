"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, BarChart3, Settings, Clock, Loader2, Trash2 } from 'lucide-react';
import { useConversations } from './useConversations';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DashboardSidebarProps {
  onNewConversation?: () => void;
  onSelectConversation?: (conversationId: string) => void;
  currentConversationId?: string;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ 
  onNewConversation,
  onSelectConversation,
  currentConversationId 
}) => {
  const router = useRouter();
  const { conversations, isLoading, error, refetch, deleteConversation } = useConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleNewConversation = () => {
    if (onNewConversation) {
      onNewConversation();
      // Refetch conversations to update the list
      refetch();
    } else {
      // Reload page to start fresh conversation
      window.location.reload();
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    }
  };

  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    // Prevent triggering the conversation selection
    event.stopPropagation();
    
    if (!confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
      return;
    }

    setDeletingId(conversationId);
    
    const success = await deleteConversation(conversationId);
    
    if (success) {
      // If we're currently viewing this conversation, reset to new conversation
      if (currentConversationId === conversationId && onNewConversation) {
        onNewConversation();
      }
    }
    
    setDeletingId(null);
  };

  const handleViewReports = () => {
    // Navigate to analytics/reports page
    router.push('/analytics');
  };

  const handleSettings = () => {
    // Navigate to settings page
    router.push('/settings');
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleNewConversation}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Cuộc trò chuyện mới
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleViewReports}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Xem báo cáo
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleSettings}
          >
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
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-500 text-center py-4">
              Lỗi: {error}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              Chưa có cuộc trò chuyện nào
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                    currentConversationId === conversation.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' 
                      : ''
                  }`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.title}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(conversation.lastMessageAt || conversation.createdAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {conversation.messageCount}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        disabled={deletingId === conversation.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                        title="Xóa cuộc trò chuyện"
                      >
                        {deletingId === conversation.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

