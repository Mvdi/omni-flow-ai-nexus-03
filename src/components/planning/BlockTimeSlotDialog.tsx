
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ban } from 'lucide-react';

interface BlockTimeSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timeSlot: { date: string; time: string } | null;
  onBlock: (reason: string, startTime: string, endTime: string) => void;
}

export const BlockTimeSlotDialog: React.FC<BlockTimeSlotDialogProps> = ({
  isOpen,
  onClose,
  timeSlot,
  onBlock
}) => {
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Set default times when dialog opens
  React.useEffect(() => {
    if (isOpen && timeSlot) {
      setStartTime(timeSlot.time);
      // Default to 15 minutes after start time
      const start = new Date(`1970-01-01T${timeSlot.time}`);
      start.setMinutes(start.getMinutes() + 15);
      setEndTime(start.toTimeString().slice(0, 5));
    }
  }, [isOpen, timeSlot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return;
    
    onBlock(reason || 'Blokeret tidspunkt', startTime, endTime);
    setReason('');
    setStartTime('');
    setEndTime('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            Bloker Tidspunkt
          </DialogTitle>
          <DialogDescription>
            {timeSlot && (
              <>
                Bloker tidspunkt den{' '}
                <strong>{formatDate(timeSlot.date)}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Fra tid *</Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">Til tid *</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Årsag (valgfri)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="F.eks. frokost, møde, ferie..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuller
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              <Ban className="h-4 w-4 mr-2" />
              Bloker Tidspunkt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
