import { useState } from 'react';
import { Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
  Input,
  Label,
} from '@lazarus-life/ui-components';
import { type SecretIdResponse, formatTTL } from '@/lib/api/approle';

interface SecretIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretIdData: SecretIdResponse | null;
  roleName: string;
}

export function SecretIdDialog({
  open,
  onOpenChange,
  secretIdData,
  roleName,
}: SecretIdDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCopy = async () => {
    if (secretIdData?.secret_id) {
      try {
        await navigator.clipboard.writeText(secretIdData.secret_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleClose = () => {
    if (!acknowledged) {
      // Ask for confirmation if not acknowledged
      const confirm = window.confirm(
        'Are you sure? This secret_id cannot be retrieved again. Make sure you have copied it.'
      );
      if (!confirm) return;
    }
    // Reset state
    setCopied(false);
    setShowSecret(false);
    setAcknowledged(false);
    onOpenChange(false);
  };

  if (!secretIdData) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Secret ID Generated
          </DialogTitle>
          <DialogDescription>
            Store this secret_id securely. It will not be shown again.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> This is a one-time display. Copy and store this secret_id 
            in a secure location. You will not be able to retrieve it again.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <p className="font-mono text-sm bg-muted px-3 py-2 rounded">{roleName}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Secret ID</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={showSecret ? secretIdData.secret_id : '•'.repeat(36)}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {secretIdData.secret_id_accessor && (
            <div className="space-y-2">
              <Label>Secret ID Accessor</Label>
              <p className="font-mono text-sm bg-muted px-3 py-2 rounded text-muted-foreground">
                {secretIdData.secret_id_accessor}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {secretIdData.secret_id_ttl !== undefined && (
              <div>
                <Label className="text-muted-foreground">TTL</Label>
                <p className="font-medium">{formatTTL(secretIdData.secret_id_ttl)}</p>
              </div>
            )}
            {secretIdData.secret_id_num_uses !== undefined && (
              <div>
                <Label className="text-muted-foreground">Max Uses</Label>
                <p className="font-medium">
                  {secretIdData.secret_id_num_uses === 0 
                    ? 'Unlimited' 
                    : secretIdData.secret_id_num_uses}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="acknowledge"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="acknowledge" className="text-sm">
            I have copied and securely stored the secret_id
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            disabled={!acknowledged && !copied}
            className={acknowledged || copied ? '' : 'opacity-50'}
          >
            {acknowledged || copied ? 'Done' : 'Copy Secret ID First'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

