import { useState, useCallback } from "react";
import {
  FarmData,
  FarmAnalytics,
  NewFarmData,
  NewCropData,
  NewActivityData,
  NewExpenseData,
  ActivityData,
} from "./types";

export const useFarm = (session: any) => {
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(null);
  const [analytics, setAnalytics] = useState<FarmAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newFarm, setNewFarm] = useState<NewFarmData>({
    name: "",
    description: "",
    location: "",
    area: "",
    type: "MIXED",
  });

  const [newCrop, setNewCrop] = useState<NewCropData>({
    name: "",
    variety: "",
    type: "VEGETABLE",
    plantedArea: "",
    plantCount: "",
    plantingDate: "",
    expectedHarvestDate: "",
    expectedYield: "",
    marketPrice: "",
  });

  const [newActivity, setNewActivity] = useState<NewActivityData>({
    title: "",
    description: "",
    type: "PLANTING",
    scheduledDate: "",
    duration: "",
    cost: "",
    cropId: "",
  });

  const [newExpense, setNewExpense] = useState<NewExpenseData>({
    title: "",
    description: "",
    type: "SEEDS",
    amount: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    expenseDate: "",
    supplier: "",
    invoiceNumber: "",
    tags: "",
  });

  // Dialog states
  const [showCreateFarm, setShowCreateFarm] = useState(false);
  const [showCreateCrop, setShowCreateCrop] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(
    null
  );

  const fetchAnalytics = useCallback(
    async (farmId: string) => {
      try {
        const response = await fetch(`/api/farms/${farmId}/analytics`, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    },
    [session?.accessToken]
  );

  const fetchFarms = useCallback(async () => {
    try {
      const response = await fetch("/api/farms", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarm(data[0]);
          fetchAnalytics(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching farms:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, fetchAnalytics]);

  const fetchExpenses = async (farmId: string) => {
    try {
      const response = await fetch(`/api/farms/expenses/farm/${farmId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const expenses = await response.json();
        setFarms((prevFarms) =>
          prevFarms.map((farm) =>
            farm.id === farmId ? { ...farm, expenses } : farm
          )
        );
        if (selectedFarm?.id === farmId) {
          setSelectedFarm((prev) => (prev ? { ...prev, expenses } : null));
        }
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const handleCreateFarm = async () => {
    try {
      const response = await fetch("/api/farms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newFarm,
          area: newFarm.area ? parseFloat(newFarm.area) : undefined,
        }),
      });

      if (response.ok) {
        setShowCreateFarm(false);
        setNewFarm({
          name: "",
          description: "",
          location: "",
          area: "",
          type: "MIXED",
        });
        fetchFarms();
      }
    } catch (error) {
      console.error("Error creating farm:", error);
    }
  };

  const handleCreateCrop = async () => {
    if (!selectedFarm) return;

    try {
      const response = await fetch("/api/farms/crops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newCrop,
          farmId: selectedFarm.id,
          plantedArea: newCrop.plantedArea
            ? parseFloat(newCrop.plantedArea)
            : undefined,
          plantCount: newCrop.plantCount
            ? parseInt(newCrop.plantCount)
            : undefined,
          expectedYield: newCrop.expectedYield
            ? parseFloat(newCrop.expectedYield)
            : undefined,
          marketPrice: newCrop.marketPrice
            ? parseFloat(newCrop.marketPrice)
            : undefined,
        }),
      });

      if (response.ok) {
        setShowCreateCrop(false);
        setNewCrop({
          name: "",
          variety: "",
          type: "VEGETABLE",
          plantedArea: "",
          plantCount: "",
          plantingDate: "",
          expectedHarvestDate: "",
          expectedYield: "",
          marketPrice: "",
        });
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error creating crop:", error);
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedFarm) return;

    try {
      const response = await fetch("/api/farms/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newActivity,
          farmId: selectedFarm.id,
          duration: newActivity.duration
            ? parseInt(newActivity.duration)
            : undefined,
          cost: newActivity.cost ? parseFloat(newActivity.cost) : undefined,
          cropId: newActivity.cropId || undefined,
        }),
      });

      if (response.ok) {
        setShowCreateActivity(false);
        setNewActivity({
          title: "",
          description: "",
          type: "PLANTING",
          scheduledDate: "",
          duration: "",
          cost: "",
          cropId: "",
        });
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error creating activity:", error);
    }
  };

  const handleEditActivity = async (
    activityId: string,
    updateData: Partial<ActivityData>
  ) => {
    try {
      const response = await fetch(`/api/farms/activities/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setEditingActivity(null);
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hoạt động này?")) return;

    try {
      const response = await fetch(`/api/farms/activities/${activityId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleUpdateActivityStatus = async (
    activityId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/farms/activities/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          actualDate:
            newStatus === "COMPLETED" ? new Date().toISOString() : undefined,
        }),
      });

      if (response.ok) {
        fetchFarms();
        if (selectedFarm) fetchAnalytics(selectedFarm.id);
      }
    } catch (error) {
      console.error("Error updating activity status:", error);
    }
  };

  const handleCreateExpense = async () => {
    if (!selectedFarm) return;

    try {
      const response = await fetch("/api/farms/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          ...newExpense,
          farmId: selectedFarm.id,
          amount: parseFloat(newExpense.amount),
          quantity: newExpense.quantity
            ? parseInt(newExpense.quantity)
            : undefined,
          unitPrice: newExpense.unitPrice
            ? parseFloat(newExpense.unitPrice)
            : undefined,
          tags: newExpense.tags
            ? newExpense.tags.split(",").map((tag) => tag.trim())
            : [],
        }),
      });

      if (response.ok) {
        setShowCreateExpense(false);
        setNewExpense({
          title: "",
          description: "",
          type: "SEEDS",
          amount: "",
          quantity: "",
          unit: "",
          unitPrice: "",
          expenseDate: "",
          supplier: "",
          invoiceNumber: "",
          tags: "",
        });
        fetchFarms();
        if (selectedFarm) {
          fetchAnalytics(selectedFarm.id);
          fetchExpenses(selectedFarm.id);
        }
      }
    } catch (error) {
      console.error("Error creating expense:", error);
    }
  };

  const selectFarm = (farm: FarmData) => {
    setSelectedFarm(farm);
    fetchAnalytics(farm.id);
  };

  return {
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
  };
};
