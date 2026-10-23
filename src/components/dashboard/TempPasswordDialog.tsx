import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** A code block with a copy-to-clipboard button - used anywhere a one-time password or
 *  similar value is shown, so it's never lost before someone can note it down. */
export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) - the value is still visible to copy by hand.
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 block bg-gray-100 rounded px-3 py-2 text-sm break-all">{value}</code>
      <Button size="icon" variant="outline" onClick={copy} title="Copy to clipboard" type="button">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

/** Shows a freshly-generated temporary password in a dialog that stays open until dismissed,
 *  with a copy button - so it's never lost in a toast that disappeared before anyone could
 *  read or copy it. */
export function TempPasswordDialog({
  password,
  onOpenChange,
  title = "New Temporary Password",
  description = "Share this password securely — the user must change it on first login.",
}: {
  password: string | null;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={Boolean(password)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{description}</p>
          {password && <CopyableCode value={password} />}
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
