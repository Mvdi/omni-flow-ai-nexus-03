
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
  onBlock: (reason: string) => void;
}

export const BlockTimeSlotDialog: React.FC<BlockTimeSlotDialogProps> = ({
  isOpen,
  onClose,
  timeSlot,
  onBlock
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBlock(reason || 'Blokeret tidspunkt');
    setReason('');
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
                Bloker tidspunkt <strong>{timeSlot.time}</strong> den{' '}
                <strong>{formatDate(timeSlot.date)}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
