import React from 'react';
import { MessageMetadata } from './message-metadata';

interface MessageContentProps {
  content: string;
  type: 'user' | 'assistant';
  intent?: string;
  confidence?: number;
  responseTime?: number;
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  type, 
  intent, 
  confidence, 
  responseTime 
}) => {
  // Function to format AI response content
  const formatContent = (text: string) => {
    // Split by double line breaks to create sections
    const sections = text.split('\n\n');
    
    return sections.map((section, index) => {
      // Check if section is a header (contains ** or * at start)
      if (section.match(/^\*\*.*\*\*$/)) {
        return (
          <h3 key={index} className="font-semibold text-base mb-2 mt-3 first:mt-0">
            {section.replace(/\*\*/g, '')}
          </h3>
        );
      }
      
      // Check if section is a subheader (contains * at start)
      if (section.match(/^\*.*$/)) {
        return (
          <h4 key={index} className="font-medium text-sm mb-2 mt-2 first:mt-0 text-agri-green-700 dark:text-agri-green-300">
            {section.replace(/\*/g, '')}
          </h4>
        );
      }
      
      // Check if section contains bullet points
      if (section.includes('* ')) {
        const lines = section.split('\n');
        return (
          <div key={index} className="mb-3">
            {lines.map((line, lineIndex) => {
              if (line.trim().startsWith('* ')) {
                return (
                  <div key={lineIndex} className="flex items-start mb-1">
                    <span className="text-agri-green-600 dark:text-agri-green-400 mr-2 mt-1">•</span>
                    <span className="text-sm leading-relaxed">{line.replace(/^\* /, '')}</span>
                  </div>
                );
              }
              return (
                <p key={lineIndex} className="text-sm leading-relaxed mb-2">
                  {line}
                </p>
              );
            })}
          </div>
        );
      }
      
      // Check if section contains numbered lists
      if (section.match(/^\d+\./)) {
        const lines = section.split('\n');
        return (
          <div key={index} className="mb-3">
            {lines.map((line, lineIndex) => {
              if (line.match(/^\d+\./)) {
                return (
                  <div key={lineIndex} className="flex items-start mb-1">
                    <span className="text-agri-green-600 dark:text-agri-green-400 mr-2 mt-1 font-medium">
                      {line.match(/^\d+\./)?.[0]}
                    </span>
                    <span className="text-sm leading-relaxed">{line.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                );
              }
              return (
                <p key={lineIndex} className="text-sm leading-relaxed mb-2">
                  {line}
                </p>
              );
            })}
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-sm leading-relaxed mb-3 last:mb-0">
          {section}
        </p>
      );
    });
  };

  if (type === 'user') {
    return (
      <div className="text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {formatContent(content)}
      {type === 'assistant' && (
        <MessageMetadata 
          intent={intent}
          confidence={confidence}
          responseTime={responseTime}
          showForUser={false}
        />
      )}
    </div>
  );
};
