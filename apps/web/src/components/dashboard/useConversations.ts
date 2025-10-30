import { useState, useEffect, useCallback } from "react";

export interface Conversation {
  id: string;
  title: string;
  description?: string;
  lastMessageAt: Date;
  messageCount: number;
  createdAt: Date;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  const LIMIT = 10; // Load 10 conversations per page

  const fetchConversations = async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const response = await fetch(
        `/api/chat/conversations?page=${pageNum}&limit=${LIMIT}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      
      if (append) {
        setConversations(prev => [...prev, ...data.conversations]);
      } else {
        setConversations(data.conversations);
      }
      
      setTotal(data.total);
      setHasMore(data.conversations.length === LIMIT && conversations.length + data.conversations.length < data.total);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchConversations(page + 1, true);
    }
  }, [page, hasMore, isLoadingMore]);

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Remove from local state immediately
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      setTotal(prev => prev - 1);
      
      return true;
    } catch (err) {
      console.error("Error deleting conversation:", err);
      setError(err instanceof Error ? err.message : "Failed to delete conversation");
      return false;
    }
  };

  const refetch = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchConversations(1, false);
  }, []);

  useEffect(() => {
    fetchConversations(1, false);
  }, []);

  return {
    conversations,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    loadMore,
    refetch,
    deleteConversation,
  };
};
