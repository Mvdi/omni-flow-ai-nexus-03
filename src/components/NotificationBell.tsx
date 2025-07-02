import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAllTicketReminders } from '@/hooks/useTicketReminders';
import { formatDanishDistance } from '@/utils/danishTime';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
  const { data: reminders = [], isLoading } = useAllTicketReminders();
  const navigate = useNavigate();
  
  const activeReminders = reminders.filter(reminder => !reminder.is_completed);
  const unreadCount = activeReminders.length;

  const handleNotificationClick = (ticketId: string) => {
    window.location.href = `/support?ticket=${ticketId}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {isLoading ? (
          <DropdownMenuItem disabled>Indlæser...</DropdownMenuItem>
        ) : unreadCount === 0 ? (
          <DropdownMenuItem disabled>Ingen påmindelser</DropdownMenuItem>
        ) : (
          activeReminders.map((reminder) => (
            <DropdownMenuItem
              key={reminder.id}
              onClick={() => handleNotificationClick(reminder.ticket_id)}
              className="cursor-pointer flex flex-col items-start p-3"
            >
              <div className="font-medium text-sm">Support Påmindelse</div>
              <div className="text-xs text-gray-600 mt-1">
                {reminder.reminder_text}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatDanishDistance(reminder.remind_at)}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};