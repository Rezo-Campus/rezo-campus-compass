import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmer la suppression",
  description = "Cette action est irréversible. Voulez-vous vraiment continuer ?",
  confirmLabel = "Supprimer",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground pl-[52px] -mt-1">{description}</p>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    resolve: ((confirmed: boolean) => void) | null;
  }>({ open: false, resolve: null });

  function confirm(): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ open: true, resolve });
    });
  }

  function handleClose(confirmed: boolean) {
    setState((s) => {
      s.resolve?.(confirmed);
      return { open: false, resolve: null };
    });
  }

  return {
    confirm,
    dialogProps: {
      open: state.open,
      onOpenChange: (open: boolean) => !open && handleClose(false),
      onConfirm: () => handleClose(true),
    },
  };
}
