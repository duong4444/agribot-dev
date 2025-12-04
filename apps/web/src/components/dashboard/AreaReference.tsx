import React, { useEffect, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info, Map, Loader2 } from 'lucide-react';
// import { ScrollArea } from '@/components/ui/scroll-area';

interface Area {
  id: string;
  name: string;
  type?: string;
  crop?: string;
}

export const AreaReference = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && areas.length === 0) {
      fetchAreas();
    }
  }, [isOpen]);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/farms/areas');
      if (res.ok) {
        const data = await res.json();
        setAreas(data);
      }
    } catch (error) {
      console.error('Failed to fetch areas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-muted-foreground hover:text-primary"
          title="Tham chiếu khu vực"
        >
          <Info className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Khu vực</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Tham chiếu Khu vực</h4>
          <p className="text-sm text-muted-foreground">
            Danh sách các khu vực và loại hình canh tác.
          </p>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : areas.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
              {areas.map((area) => (
                <div key={area.id} className="flex justify-between items-start text-sm border-b pb-2 last:border-0 last:pb-0">
                  <div className="font-medium text-primary">{area.name}</div>
                  <div className="text-right text-muted-foreground max-w-[150px]">
                    {area.type || area.crop || 'Chưa có thông tin'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4 text-muted-foreground">
              Chưa có khu vực nào.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
