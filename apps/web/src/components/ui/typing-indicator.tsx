import React from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  message?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  message = "AI đang suy nghĩ..." 
}) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700">
        <div className="flex items-start space-x-2">
          <Bot className="h-4 w-4 mt-1 flex-shrink-0 text-agri-green-600" />
          <div className="flex space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-gray-500 ml-2">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
