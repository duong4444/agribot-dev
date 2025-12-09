"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { MuiThemeProvider } from '@/components/providers/mui-theme-provider';
import { Card, CardContent } from '@/components/ui/card';

export interface ActivityFilters {
  startDate: Date | null;
  endDate: Date | null;
  type: string;
  areaId: string;
  cropName: string;
  search: string;
}

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  areas?: Array<{ id: string; name: string }>;
  crops?: string[];
}

const activityTypes = [
  { value: 'all', label: 'Tất cả' },
  { value: 'seeding', label: 'Gieo trồng' },
  { value: 'fertilize', label: 'Bón phân' },
  { value: 'pesticide', label: 'Phun thuốc' },
  { value: 'harvest', label: 'Thu hoạch' },
  { value: 'watering', label: 'Tưới nước' },
  { value: 'other', label: 'Khác' },
];

export const ActivityFiltersComponent: React.FC<ActivityFiltersProps> = ({
  filters,
  onFiltersChange,
  areas = [],
  crops = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearFilters = () => {
    const clearedFilters: ActivityFilters = {
      startDate: null,
      endDate: null,
      type: 'all',
      areaId: 'all',
      cropName: 'all',
      search: '',
    };
    onFiltersChange(clearedFilters);
    setSearchInput('');
  };

  const activeFiltersCount = [
    filters.startDate,
    filters.endDate,
    filters.type !== 'all',
    filters.areaId !== 'all',
    filters.cropName !== 'all',
    filters.search,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <MuiThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
        <Card>
          <CardContent className="pt-6">
            {/* Search and Toggle Button */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm mô tả hoạt động..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={isExpanded ? "default" : "outline"}
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full sm:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                Bộ lọc
                {hasActiveFilters && (
                  <Badge className="ml-2" variant="secondary">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Date Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Từ ngày</label>
                  <DatePicker
                    value={filters.startDate}
                    onChange={(newValue) =>
                      onFiltersChange({ ...filters, startDate: newValue })
                    }
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Đến ngày</label>
                  <DatePicker
                    value={filters.endDate}
                    onChange={(newValue) =>
                      onFiltersChange({ ...filters, endDate: newValue })
                    }
                    minDate={filters.startDate || undefined}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </div>

                {/* Activity Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Loại hoạt động</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Area */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Khu vực</label>
                  <Select
                    value={filters.areaId}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, areaId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Crop - only show if we have crops */}
                {crops.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cây trồng</label>
                    <Select
                      value={filters.cropName}
                      onValueChange={(value) =>
                        onFiltersChange({ ...filters, cropName: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {crops.map((crop) => (
                          <SelectItem key={crop} value={crop}>
                            {crop}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && !isExpanded && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {filters.startDate && (
                  <Badge variant="secondary">
                    Từ: {format(filters.startDate, 'dd/MM/yyyy', { locale: vi })}
                  </Badge>
                )}
                {filters.endDate && (
                  <Badge variant="secondary">
                    Đến: {format(filters.endDate, 'dd/MM/yyyy', { locale: vi })}
                  </Badge>
                )}
                {filters.type !== 'all' && (
                  <Badge variant="secondary">
                    {activityTypes.find((t) => t.value === filters.type)?.label}
                  </Badge>
                )}
                {filters.areaId !== 'all' && (
                  <Badge variant="secondary">
                    {areas.find((a) => a.id === filters.areaId)?.name}
                  </Badge>
                )}
                {filters.cropName !== 'all' && (
                  <Badge variant="secondary">{filters.cropName}</Badge>
                )}
                {filters.search && (
                  <Badge variant="secondary">Tìm: "{filters.search}"</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </LocalizationProvider>
    </MuiThemeProvider>
  );
};
