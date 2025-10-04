# Farm Components

This directory contains the refactored farm management components for the AgriBot application.

## Component Structure

### 1. **Types** (`types.ts`)
Shared TypeScript interfaces for all farm-related data structures.

**Key Interfaces:**
- `FarmData` - Farm information and metadata
- `CropData` - Crop details and tracking
- `ActivityData` - Farm activities and tasks
- `ExpenseData` - Financial tracking
- `FarmAnalytics` - Analytics and statistics
- Form data interfaces for creating new records

---

### 2. **FarmHeader** (`FarmHeader.tsx`)
Header component with navigation and user information.

**Props:**
- `userName`: string | null | undefined - The current user's name

**Features:**
- Farm management branding
- User greeting
- Navigation to Chat Bot
- Dark mode toggle
- Sign out functionality

---

### 3. **FarmSelection** (`FarmSelection.tsx`)
Component for selecting and creating farms.

**Props:**
- `farms`: FarmData[] - Array of available farms
- `selectedFarm`: FarmData | null - Currently selected farm
- `onSelectFarm`: (farm: FarmData) => void - Farm selection handler
- `newFarm`: NewFarmData - Form data for new farm
- `setNewFarm`: (farm: NewFarmData) => void - Form data setter
- `showCreateFarm`: boolean - Dialog visibility state
- `setShowCreateFarm`: (show: boolean) => void - Dialog state setter
- `onCreateFarm`: () => void - Farm creation handler

**Features:**
- Farm list display with selection
- Create new farm dialog
- Farm information cards
- Empty state handling

---

### 4. **FarmTabs** (`FarmTabs.tsx`)
Main tab container for farm management sections.

**Props:**
- `selectedFarm`: FarmData - Currently selected farm
- `analytics`: FarmAnalytics | null - Farm analytics data
- Form data and handlers for all sections (crops, activities, expenses)

**Features:**
- Tab navigation (Overview, Crops, Activities, Expenses, Analytics, Advanced Analytics)
- Props forwarding to child components
- Consistent layout structure

---

### 5. **FarmOverview** (`FarmOverview.tsx`)
Overview tab showing key farm statistics.

**Props:**
- `analytics`: FarmAnalytics | null - Analytics data

**Features:**
- Key metrics cards (crops, activities, expenses, profit)
- Visual statistics display
- Responsive grid layout

---

### 6. **CropsSection** (`CropsSection.tsx`)
Component for managing farm crops.

**Props:**
- `selectedFarm`: FarmData - Current farm
- `newCrop`: NewCropData - Form data for new crop
- `setNewCrop`: (crop: NewCropData) => void - Form setter
- `showCreateCrop`: boolean - Dialog visibility
- `setShowCreateCrop`: (show: boolean) => void - Dialog setter
- `onCreateCrop`: () => void - Creation handler

**Features:**
- Crop list display
- Create new crop dialog
- Crop information cards
- Empty state handling

---

### 7. **ActivitiesSection** (`ActivitiesSection.tsx`)
Component for managing farm activities.

**Props:**
- `selectedFarm`: FarmData - Current farm
- `newActivity`: NewActivityData - Form data for new activity
- `setNewActivity`: (activity: NewActivityData) => void - Form setter
- `showCreateActivity`: boolean - Dialog visibility
- `setShowCreateActivity`: (show: boolean) => void - Dialog setter
- `onCreateActivity`: () => void - Creation handler
- `editingActivity`: ActivityData | null - Activity being edited
- `setEditingActivity`: (activity: ActivityData | null) => void - Edit setter
- `onEditActivity`: (id: string, data: Partial<ActivityData>) => void - Edit handler
- `onDeleteActivity`: (id: string) => void - Delete handler
- `onUpdateActivityStatus`: (id: string, status: string) => void - Status update handler

**Features:**
- Activity list with status management
- Create/edit/delete activities
- Status dropdown for each activity
- Activity information display

---

### 8. **ExpensesSection** (`ExpensesSection.tsx`)
Component for managing farm expenses.

**Props:**
- `selectedFarm`: FarmData - Current farm
- `newExpense`: NewExpenseData - Form data for new expense
- `setNewExpense`: (expense: NewExpenseData) => void - Form setter
- `showCreateExpense`: boolean - Dialog visibility
- `setShowCreateExpense`: (show: boolean) => void - Dialog setter
- `onCreateExpense`: () => void - Creation handler

**Features:**
- Expense list display
- Create new expense dialog
- Expense categorization
- Financial tracking

---

### 9. **AnalyticsSection** (`AnalyticsSection.tsx`)
Component for displaying farm analytics.

**Props:**
- `analytics`: FarmAnalytics | null - Analytics data
- `selectedFarm`: FarmData (optional) - For advanced analytics
- `showAdvanced`: boolean (optional) - Show advanced analytics tabs

**Features:**
- Basic analytics overview
- Advanced analytics with charts
- Financial, crop, activity, and expense analytics
- Tabbed interface for different analytics types

---

### 10. **useFarm Hook** (`useFarm.ts`)
Custom React hook for managing farm state and operations.

**Returns:**
```typescript
{
  // State
  farms: FarmData[];
  selectedFarm: FarmData | null;
  analytics: FarmAnalytics | null;
  loading: boolean;
  newFarm: NewFarmData;
  newCrop: NewCropData;
  newActivity: NewActivityData;
  newExpense: NewExpenseData;
  showCreateFarm: boolean;
  showCreateCrop: boolean;
  showCreateActivity: boolean;
  showCreateExpense: boolean;
  editingActivity: ActivityData | null;
  
  // Setters
  setNewFarm: (farm: NewFarmData) => void;
  setNewCrop: (crop: NewCropData) => void;
  setNewActivity: (activity: NewActivityData) => void;
  setNewExpense: (expense: NewExpenseData) => void;
  setShowCreateFarm: (show: boolean) => void;
  setShowCreateCrop: (show: boolean) => void;
  setShowCreateActivity: (show: boolean) => void;
  setShowCreateExpense: (show: boolean) => void;
  setEditingActivity: (activity: ActivityData | null) => void;
  
  // Actions
  fetchFarms: () => Promise<void>;
  selectFarm: (farm: FarmData) => void;
  handleCreateFarm: () => Promise<void>;
  handleCreateCrop: () => Promise<void>;
  handleCreateActivity: () => Promise<void>;
  handleEditActivity: (id: string, data: Partial<ActivityData>) => Promise<void>;
  handleDeleteActivity: (id: string) => Promise<void>;
  handleUpdateActivityStatus: (id: string, status: string) => Promise<void>;
  handleCreateExpense: () => Promise<void>;
}
```

**Features:**
- Centralized state management
- API integration
- Form handling
- CRUD operations
- Loading states
- Error handling

---

## Usage Example

```tsx
import {
  FarmHeader,
  FarmSelection,
  FarmTabs,
  useFarm,
} from '@/components/farm';

const FarmDashboard = () => {
  const { data: session } = useSession();
  const {
    farms,
    selectedFarm,
    analytics,
    loading,
    // ... other state and handlers
  } = useFarm();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <FarmHeader userName={session?.user?.name} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FarmSelection
          farms={farms}
          selectedFarm={selectedFarm}
          onSelectFarm={selectFarm}
          // ... other props
        />
        
        {selectedFarm && (
          <FarmTabs
            selectedFarm={selectedFarm}
            analytics={analytics}
            // ... other props
          />
        )}
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
6. **Custom Hook**: Farm logic is extracted into a reusable hook
7. **Type Safety**: Full TypeScript support with proper interfaces
8. **Performance**: Better code splitting and lazy loading potential

---

## File Structure

```
apps/web/src/components/farm/
├── types.ts                    # Shared TypeScript interfaces
├── FarmHeader.tsx              # Header with navigation
├── FarmSelection.tsx           # Farm selection and creation
├── FarmTabs.tsx                # Main tab container
├── FarmOverview.tsx            # Overview statistics
├── CropsSection.tsx            # Crop management
├── ActivitiesSection.tsx       # Activity management
├── ExpensesSection.tsx         # Expense management
├── AnalyticsSection.tsx        # Analytics display
├── useFarm.ts                  # Custom hook for state management
├── index.ts                    # Barrel export file
└── README.md                   # This file
```

---

## Migration from Original

The original farm page (1466 lines) has been refactored into:
- **Main page**: 124 lines (91% reduction)
- **10 focused components**: Each handling specific functionality
- **1 custom hook**: Centralized state management
- **1 types file**: Shared interfaces

This refactoring improves:
- Code readability and maintainability
- Component reusability
- Testing capabilities
- Development experience
- Performance optimization potential
