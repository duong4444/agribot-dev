import { useState, useRef, useEffect } from "react";

export interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  timestamp: Date;
  intent?: string;
  confidence?: number;
  responseTime?: number;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("AI đang suy nghĩ...");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // begin
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      type: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    
    // 🆕 Detect device control commands (improved)
    // Check for action words + device words
    const hasActionWord = /(bật|tắt|mở|đóng|ngừng|dừng|kích hoạt)/i.test(currentMessage);
    const hasDeviceWord = /(tưới|đèn|bơm|máy bơm|pump|light|tự động)/i.test(currentMessage);
    const isDeviceControl = hasActionWord && hasDeviceWord;
    
    setLoadingMessage(isDeviceControl ? "Đang gửi lệnh..." : "AI đang suy nghĩ...");
    setIsLoading(true);

    try {
      // Call actual API
      console.log(
        "!!!!! : conversationId post chat/messages_1: ",
        conversationId
      );

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: currentMessage,
          conversationId: conversationId, // Sử dụng conversationId hiện tại, ban đầu post conversationId null
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      console.log("conversationID useChats_1: ", conversationId);
      console.log("conversationID trả về từ api: ", data.conversation?.id);

      // Cập nhật conversationId từ response nếu chưa có
      if (!conversationId && data.conversation?.id) {
        setConversationId(data.conversation.id);
      }

      
      console.log("conversationID sau if: ", conversationId);

      const assistantMessage: Message = {
        id: data.response.id,
        content: data.response.content,
        type: "assistant",
        timestamp: new Date(),
        intent: data.response.intent,
        confidence: data.response.confidence,
        responseTime: data.response.responseTime,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);

      // Fallback message on error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
        type: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  // end

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInputMessage("");
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      
      if (!response.ok) {
        throw new Error("Failed to load conversation");
      }

      const data = await response.json();
      
      // Set conversationId
      setConversationId(conversationId);
      
      // Load messages
      const loadedMessages: Message[] = data.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type.toLowerCase() as "user" | "assistant",
        timestamp: new Date(msg.createdAt),
        intent: msg.intent,
        confidence: msg.confidence,
        responseTime: msg.responseTime,
      }));
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    loadingMessage,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
    resetConversation,
    loadConversation,
    conversationId,
  };
};
