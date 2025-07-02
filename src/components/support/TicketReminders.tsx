import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTicketReminders, useAddTicketReminder, useCompleteReminder } from '@/hooks/useTicketReminders';
import { Bell, Plus, Check, Clock } from 'lucide-react';
import { formatDanishDateTime } from '@/utils/danishTime';

interface TicketRemindersProps {
  ticketId: string;
}

export const TicketReminders = ({ ticketId }: TicketRemindersProps) => {
  const [open, setOpen] = useState(false);
  const [remindAt, setRemindAt] = useState('');
  const [reminderText, setReminderText] = useState('');

  const { data: reminders = [], isLoading } = useTicketReminders(ticketId);
  const addReminder = useAddTicketReminder();
  const completeReminder = useCompleteReminder();

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!remindAt || !reminderText.trim()) return;

    await addReminder.mutateAsync({
      ticketId,
      remindAt: new Date(remindAt).toISOString(),
      reminderText: reminderText.trim()
    });

    setRemindAt('');
    setReminderText('');
    setOpen(false);
  };

  const handleCompleteReminder = async (reminderId: string) => {
    await completeReminder.mutateAsync(reminderId);
  };

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Påmindelser
            {reminders.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {reminders.length}
              </Badge>
            )}
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ny påmindelse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opret påmindelse</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddReminder} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remindAt">Påmind mig den</Label>
                  <Input
                    id="remindAt"
                    type="datetime-local"
                    value={remindAt}
                    onChange={(e) => setRemindAt(e.target.value)}
                    min={formatDateTimeLocal(now)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminderText">Påmindelse tekst</Label>
                  <Textarea
                    id="reminderText"
                    value={reminderText}
                    onChange={(e) => setReminderText(e.target.value)}
                    placeholder="Hvad skal du huske?"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Annuller
                  </Button>
                  <Button type="submit" disabled={addReminder.isPending}>
                    {addReminder.isPending ? 'Opretter...' : 'Opret påmindelse'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-sm text-gray-500">
            Indlæser påmindelser...
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Ingen aktive påmindelser</p>
            <p className="text-xs mt-1">Opret en påmindelse for denne ticket</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const remindDate = new Date(reminder.remind_at);
              const isPastDue = remindDate < now;
              
              return (
                <div 
                  key={reminder.id} 
                  className={`p-3 rounded-lg border ${
                    isPastDue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {reminder.reminder_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className={`text-xs ${isPastDue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatDanishDateTime(reminder.remind_at)}
                          {isPastDue && ' (Forfaldent)'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCompleteReminder(reminder.id)}
                      disabled={completeReminder.isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};