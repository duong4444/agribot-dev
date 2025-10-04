"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FarmHeader,
  FarmSelection,
  FarmTabs,
  useFarm,
} from "@/components/farm";

export default function FarmDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const {
    // State
    farms,
    selectedFarm,
    analytics,
    loading,
    newFarm,
    newCrop,
    newActivity,
    newExpense,
    showCreateFarm,
    showCreateCrop,
    showCreateActivity,
    showCreateExpense,
    editingActivity,

    // Setters
    setNewFarm,
    setNewCrop,
    setNewActivity,
    setNewExpense,
    setShowCreateFarm,
    setShowCreateCrop,
    setShowCreateActivity,
    setShowCreateExpense,
    setEditingActivity,

    // Actions
    fetchFarms,
    selectFarm,
    handleCreateFarm,
    handleCreateCrop,
    handleCreateActivity,
    handleEditActivity,
    handleDeleteActivity,
    handleUpdateActivityStatus,
    handleCreateExpense,
  } = useFarm(session);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    fetchFarms();
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-agri-green-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <FarmHeader userName={session.user?.name} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FarmSelection
          farms={farms}
          selectedFarm={selectedFarm}
          onSelectFarm={selectFarm}
          newFarm={newFarm}
          setNewFarm={setNewFarm}
          showCreateFarm={showCreateFarm}
          setShowCreateFarm={setShowCreateFarm}
          onCreateFarm={handleCreateFarm}
        />

        {/* Farm Details */}
        {selectedFarm && (
          <FarmTabs
            selectedFarm={selectedFarm}
            analytics={analytics}
            newCrop={newCrop}
            setNewCrop={setNewCrop}
            showCreateCrop={showCreateCrop}
            setShowCreateCrop={setShowCreateCrop}
            onCreateCrop={handleCreateCrop}
            newActivity={newActivity}
            setNewActivity={setNewActivity}
            showCreateActivity={showCreateActivity}
            setShowCreateActivity={setShowCreateActivity}
            onCreateActivity={handleCreateActivity}
            editingActivity={editingActivity}
            setEditingActivity={setEditingActivity}
            onEditActivity={handleEditActivity}
            onDeleteActivity={handleDeleteActivity}
            onUpdateActivityStatus={handleUpdateActivityStatus}
            newExpense={newExpense}
            setNewExpense={setNewExpense}
            showCreateExpense={showCreateExpense}
            setShowCreateExpense={setShowCreateExpense}
            onCreateExpense={handleCreateExpense}
          />
        )}
      </div>
    </div>
  );
}
