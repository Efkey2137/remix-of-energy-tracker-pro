import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { findReadingBounds, toLocalDateInputValue, type Reading } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function AddReadingDialog({
  readings,
  open,
  onOpenChange,
  onSaved,
  showTrigger = true,
}: {
  readings: Reading[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (reading: Reading) => void;
  showTrigger?: boolean;
}) {
  const { t } = useT();
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [date, setDate] = useState(() => toLocalDateInputValue());
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const today = toLocalDateInputValue();
  const { previous, next } = findReadingBounds(readings, date);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error(t.errorInvalidReading);
      return;
    }
    if (date > today) {
      toast.error(t.errorFutureDate);
      return;
    }
    if (previous && num < Number(previous.value)) {
      toast.error(t.errorLowerReading);
      return;
    }
    if (next && num > Number(next.value)) {
      toast.error(t.errorHigherReading);
      return;
    }
    if (readings.some((r) => r.reading_date === date)) {
      toast.error(t.errorSameDate);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("meter_readings")
        .insert({
          user_id: user.id,
          reading_date: date,
          value: num,
          note: note || null,
        })
        .select("id, reading_date, value, note")
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      onSaved?.(data as Reading);
      toast.success(t.readingSaved);
      setDialogOpen(false);
      setValue("");
      setNote("");
      setDate(today);
    } catch {
      toast.error(t.backendUnavailable);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <button
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Plus className="h-5 w-5" />
            {t.addReading}
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t.addReading}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="date">{t.date}</Label>
            <Input
              id="date"
              type="date"
              required
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="value">{t.meterValue}</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min={previous ? Number(previous.value) : 0}
              max={next ? Number(next.value) : undefined}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1"
              placeholder={previous ? `≥ ${previous.value}` : ""}
            />
            {!previous && !next && (
              <p className="text-xs text-muted-foreground mt-1">{t.firstReadingInfo}</p>
            )}
          </div>
          <div>
            <Label htmlFor="note">{t.note}</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              maxLength={200}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
