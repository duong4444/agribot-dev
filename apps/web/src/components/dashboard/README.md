# Dashboard Components

This directory contains the refactored dashboard components for the AgriBot application.

## Component Structure

### 1. **DashboardHeader** (`DashboardHeader.tsx`)
The main header component with navigation and user information.

**Props:**
- `userName`: string | null | undefined - The current user's name

**Features:**
- Logo and branding
- User greeting
- Navigation buttons (Farm Management, Analytics, Settings)
- Sign out functionality

---

### 2. **ChatInterface** (`ChatInterface.tsx`)
The main chat interface component that combines MessageList and ChatInput.

**Props:**
- `messages`: Message[] - Array of chat messages
- `inputMessage`: string - Current input value
- `setInputMessage`: (value: string) => void - Input change handler
- `isLoading`: boolean - Loading state
- `messagesEndRef`: React.RefObject<HTMLDivElement> - Ref for auto-scrolling
- `onSendMessage`: () => void - Send message handler
- `onKeyPress`: (e: React.KeyboardEvent) => void - Keyboard event handler

---

### 3. **MessageList** (`MessageList.tsx`)
Displays the list of chat messages with proper styling.

**Props:**
- `messages`: Message[] - Array of chat messages
- `isLoading`: boolean - Loading state for typing indicator
- `messagesEndRef`: React.RefObject<HTMLDivElement> - Ref for auto-scrolling

**Features:**
- Empty state with welcome message
- Message bubbles with user/assistant distinction
- Message metadata (intent, confidence, response time)
- Auto-scroll to bottom
- Typing indicator

---

### 4. **ChatInput** (`ChatInput.tsx`)
Input component for sending messages.

**Props:**
- `value`: string - Current input value
- `onChange`: (value: string) => void - Input change handler
- `onSend`: () => void - Send button click handler
- `onKeyPress`: (e: React.KeyboardEvent) => void - Keyboard event handler
- `isLoading`: boolean - Loading state
- `placeholder`: string (optional) - Input placeholder text

**Features:**
- Text input with placeholder
- Send button with loading state
- Enter key support
- Disabled state during loading

---

### 5. **DashboardSidebar** (`DashboardSidebar.tsx`)
Sidebar with quick actions and recent conversations.

**Features:**
- Quick action buttons (New conversation, View reports, Settings)
- Recent conversations list (currently empty state)

---

### 6. **useChat Hook** (`useChat.ts`)
Custom React hook for managing chat state and logic.

**Returns:**
```typescript
{
  messages: Message[];
  inputMessage: string;
  setInputMessage: (value: string) => void;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  sendMessage: () => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
}
```

**Features:**
- Message state management
- API communication
- Auto-scroll functionality
- Loading state management
- Error handling

---

## Types

### Message
```typescript
interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  intent?: string;
  confidence?: number;
  responseTime?: number;
}
```

---

## Usage Example

```tsx
import { 
  DashboardHeader, 
  ChatInterface, 
  DashboardSidebar,
  useChat
} from '@/components/dashboard';

const Dashboard = () => {
  const { data: session } = useSession();
  const {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
  } = useChat();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader userName={session?.user?.name} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3">
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
          
          <DashboardSidebar />
        </div>
      </div>
    </div>
  );
};
```

---

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be reused in different contexts
3. **Maintainability**: Easier to maintain and update individual components
4. **Testability**: Smaller components are easier to test
5. **Code Organization**: Logic is separated from presentation
6. **Custom Hook**: Chat logic is extracted into a reusable hook
7. **Type Safety**: Full TypeScript support with proper interfaces

---

## File Structure

```
apps/web/src/components/dashboard/
├── ChatInput.tsx           # Input component for sending messages
├── ChatInterface.tsx       # Main chat interface combining list and input
├── DashboardHeader.tsx     # Header with navigation
├── DashboardSidebar.tsx    # Sidebar with quick actions
├── MessageList.tsx         # Message display component
├── useChat.ts             # Custom hook for chat logic
├── index.ts               # Barrel export file
└── README.md              # This file
```

