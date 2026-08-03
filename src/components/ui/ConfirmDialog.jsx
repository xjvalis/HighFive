import { useContext } from "react";
import { LanguageContext } from "@/lib/language";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Simple reusable confirm dialog.
 * Props: open, onConfirm, onCancel, title, description, confirmLabel, destructive
 */
export default function ConfirmDialog({ open, onConfirm, onCancel, title, description, confirmLabel, destructive = false }) {
  const { lang } = useContext(LanguageContext);
  return (
    <AlertDialog open={open} onOpenChange={v => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{lang === 'cs' ? 'Zrušit' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmLabel || (lang === 'cs' ? 'Potvrdit' : 'Confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}