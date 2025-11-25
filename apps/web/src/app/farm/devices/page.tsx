import { DeviceList } from "@/components/iot/DeviceList";

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Device Management</h1>
        <p className="text-muted-foreground">
          Manage your IoT devices and sensors.
        </p>
      </div>
      
      <DeviceList />
    </div>
  );
}
