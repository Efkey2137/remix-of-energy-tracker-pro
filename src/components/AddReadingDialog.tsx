import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import type { Reading } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export function AddReadingDialog({
  readings,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  readings: Reading[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const { t } = useT();
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const lastValue = readings.length ? Number(readings[0].value) : null;
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Invalid value");
      return;
    }
    if (lastValue != null && num < lastValue) {
      toast.error(t.errorLowerReading);
      return;
    }
    if (readings.some((r) => r.reading_date === date)) {
      toast.error(t.errorSameDate);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("meter_readings").insert({
      user_id: user.id,
      reading_date: date,
      value: num,
      note: note || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.readingSaved);
    setDialogOpen(false);
    setValue("");
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
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
            <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="value">{t.meterValue}</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min={lastValue ?? 0}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1"
              placeholder={lastValue != null ? `> ${lastValue}` : ""}
            />
            {lastValue == null && (
              <p className="text-xs text-muted-foreground mt-1">{t.firstReadingInfo}</p>
            )}
          </div>
          <div>
            <Label htmlFor="note">{t.note}</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" maxLength={200} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
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