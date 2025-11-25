"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Area {
  id: string;
  name: string;
}

interface AssignAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device: {
    id: string;
    name: string;
    areaId: string | null;
  };
}

export function AssignAreaModal({
  isOpen,
  onClose,
  onSuccess,
  device,
}: AssignAreaModalProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(device.areaId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAreas();
      setSelectedAreaId(device.areaId || "");
    }
  }, [isOpen, device]);

  const fetchAreas = async () => {
    try {
      const res = await fetch("/api/farms/areas");
      if (res.ok) {
        const data = await res.json();
        setAreas(data);
      }
    } catch (error) {
      console.error("Failed to fetch areas", error);
    }
  };

  const handleSave = async () => {
    if (!selectedAreaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/iot/devices/${device.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaId: selectedAreaId }),
      });

      if (!res.ok) throw new Error("Failed to assign area");

      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Area</DialogTitle>
          <DialogDescription>
            Assign <strong>{device.name}</strong> to a specific area in your farm.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="area" className="text-right">
              Area
            </Label>
            <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !selectedAreaId}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
