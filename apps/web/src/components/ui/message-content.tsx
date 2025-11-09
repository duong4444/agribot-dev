import React from 'react';
import { MessageMetadata } from './message-metadata';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  
  if (type === 'user') {
    return (
      <div className="text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0 prose-headings:font-semibold prose-h3:text-base prose-h3:mb-2 prose-h3:mt-3 first:prose-h3:mt-0 prose-ul:my-3 prose-li:my-1 prose-li:leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Override default components to match your styling
            h3: ({node, ...props}) => <h3 className="font-semibold text-base mb-2 mt-3 first:mt-0" {...props} />,
            p: ({node, ...props}) => <p className="text-sm leading-relaxed mb-3 last:mb-0" {...props} />,
            ul: ({node, ...props}) => <ul className="space-y-1" {...props} />,
            li: ({node, ...props}) => (
              <div className="flex items-start">
                <span className="text-agri-green-600 dark:text-agri-green-400 mr-2 leading-relaxed">•</span>
                <span className="flex-1 text-sm leading-relaxed">{props.children}</span>
              </div>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
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
