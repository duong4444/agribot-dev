"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { useConversations } from './useConversations';


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
  const { 
    conversations, 
    isLoading, 
    isLoadingMore,
    error, 
    hasMore,
    loadMore,
    deleteConversation,
    refetch
  } = useConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleNewConversation = () => {
    if (onNewConversation) {
      onNewConversation();
      refetch();
    } else {
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
    
    // Show confirmation modal
    setConversationToDelete(conversationId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;

    setDeletingId(conversationToDelete);
    
    const success = await deleteConversation(conversationToDelete);
    
    if (success) {
      // If we're currently viewing this conversation, reset to new conversation
      if (currentConversationId === conversationToDelete && onNewConversation) {
        onNewConversation();
      }
    }
    
    setDeletingId(null);
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  // Infinite scroll handler
  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Trigger load more when scrolled to 80% of the container
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      loadMore();
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isLoadingMore, hasMore]);

  return (
    <>
      <div className="space-y-4">
      {/* Recent Conversations */}
      <Card className="border-gray-200 dark:border-gray-700 shadow-lg h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="space-y-4 pb-4 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-agri-green-600 dark:text-agri-green-400" />
              <span>Lịch sử trò chuyện</span>
            </CardTitle>
            <Button 
              size="sm"
              className="w-full bg-gradient-to-r from-agri-green-600 to-agri-green-700 hover:from-agri-green-700 hover:to-agri-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              onClick={handleNewConversation}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Tạo cuộc trò chuyện mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-agri-green-600 dark:text-agri-green-400" />
              <span className="mt-3 text-sm text-gray-500 dark:text-gray-400">Đang tải lịch sử...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Lỗi: {error}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có cuộc trò chuyện nào</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Bắt đầu trò chuyện đầu tiên của bạn!</p>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              className="space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 flex-1"
            >
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    currentConversationId === conversation.id 
                      ? 'bg-gradient-to-r from-agri-green-50 to-emerald-50 dark:from-agri-green-900/20 dark:to-emerald-900/20 border-agri-green-300 dark:border-agri-green-700 shadow-md scale-[1.02]' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-agri-green-200 dark:hover:border-agri-green-800 hover:shadow-md hover:scale-[1.01]'
                  }`}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        currentConversationId === conversation.id
                          ? 'text-agri-green-900 dark:text-agri-green-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {conversation.title}
                      </p>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        disabled={deletingId === conversation.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:scale-110"
                        title="Xóa cuộc trò chuyện"
                      >
                        {deletingId === conversation.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-agri-green-600 dark:text-agri-green-400" />
                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-300 font-medium">Đang tải thêm...</span>
                </div>
              )}
              
              {/* End of List Indicator */}
              {!hasMore && conversations.length > 0 && (
                <div className="text-center py-3 mt-2">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">✓ Đã hiển thị tất cả</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Delete Confirmation Modal */}
    <ConfirmModal
      isOpen={showDeleteModal}
      onClose={cancelDelete}
      onConfirm={confirmDelete}
      title="Xóa cuộc trò chuyện"
      message="Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác."
      confirmText="Xóa"
      cancelText="Hủy"
      isLoading={deletingId !== null}
      variant="danger"
    />
    </>
  );
};

