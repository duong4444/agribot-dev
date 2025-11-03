import React from 'react';
import { Clock, Target } from 'lucide-react';

interface MessageMetadataProps {
  intent?: string;
  confidence?: number;
  responseTime?: number;
  showForUser?: boolean;
}

export const MessageMetadata: React.FC<MessageMetadataProps> = ({ 
  intent, 
  confidence, 
  responseTime, 
  showForUser = false 
}) => {
  if (showForUser) return null;

  const getIntentLabel = (intent: string) => {
    const intentLabels: Record<string, string> = {
      planting: 'Trồng trọt',
      care: 'Chăm sóc',
      harvest: 'Thu hoạch',
      soil: 'Đất đai',
      weather: 'Thời tiết',
      pest: 'Sâu bệnh',
      general: 'Chung',
      error: 'Lỗi'
    };
    return intentLabels[intent] || intent;
  };

  return (
    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
      {intent && (
        <div className="flex items-center space-x-1">
          <Target className="h-3 w-3" />
          <span>{getIntentLabel(intent)}</span>
        </div>
      )}
      
      {responseTime && (
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{responseTime}ms</span>
        </div>
      )}
    </div>
  );
};
