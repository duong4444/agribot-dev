import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Phone, Mail } from 'lucide-react';

interface ContactInfoProps {
  phone: string;
  email: string;
}

export const ContactInfo = ({ phone, email }: ContactInfoProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-muted-foreground hover:text-primary"
          title="Thông tin liên hệ"
        >
          <Phone className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Liên hệ</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Thông tin liên hệ</h4>
          <p className="text-sm text-muted-foreground">
            Liên hệ với chúng tôi để được hỗ trợ.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số điện thoại</p>
              <p className="text-sm font-medium">{phone}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium break-all">{email}</p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
