"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Signal, SignalZero } from "lucide-react";
import { AssignAreaModal } from "./AssignAreaModal";
import { useToast } from "@/components/ui/use-toast";

interface Device {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  isActive: boolean;
  areaId: string | null;
  area?: {
    id: string;
    name: string;
  };
  updatedAt: string;
}

export function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/iot/devices");
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAssignClick = (device: Device) => {
    setSelectedDevice(device);
    setIsAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    fetchDevices(); // Refresh list
    setIsAssignModalOpen(false);
    setSelectedDevice(null);
    toast({
      title: "Success",
      description: "Device assigned successfully",
    });
  };

  if (loading) {
    return <div>Loading devices...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Area</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell className="font-medium">{device.serialNumber}</TableCell>
                <TableCell>{device.name}</TableCell>
                <TableCell>{device.type}</TableCell>
                <TableCell>
                  {device.isActive ? (
                    <Badge variant="default" className="bg-green-500">
                      <Signal className="w-3 h-3 mr-1" /> Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <SignalZero className="w-3 h-3 mr-1" /> Offline
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {device.area ? (
                    <Badge variant="outline">{device.area.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>{new Date(device.updatedAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignClick(device)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Assign Area
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No devices found. Connect a device to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {selectedDevice && (
        <AssignAreaModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={handleAssignSuccess}
          device={selectedDevice}
        />
      )}
    </Card>
  );
}
