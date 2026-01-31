/**
 * PaymentForm Component
 * Record payments against invoices
 */

import type { PaymentMethod, CreatePaymentRequest } from "@lazarus-life/shared/types/billing";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  Banknote,
  CreditCard,
  Loader2,
  Receipt,
  Smartphone,
  X,
} from "lucide-react";
import { memo, useState, useCallback } from "react";
import { useCreatePayment, useAllocatePayment } from "@/hooks/api/billing";

interface PaymentFormProps {
  patientId: string;
  patientName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  balanceDue?: number;
  currencyCode?: string;
  onSuccess?: (receiptNumber: string) => void;
  onCancel?: () => void;
  className?: string;
}

const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Receipt },
  { value: "mobile_payment", label: "Mobile Payment", icon: Smartphone },
  { value: "cheque", label: "Cheque", icon: Receipt },
  { value: "insurance", label: "Insurance", icon: Receipt },
  { value: "other", label: "Other", icon: Receipt },
];

export const PaymentForm = memo(function PaymentForm({
  patientId,
  patientName,
  invoiceId,
  invoiceNumber,
  balanceDue,
  currencyCode = "USD",
  onSuccess,
  onCancel,
  className,
}: PaymentFormProps) {
  const [amount, setAmount] = useState(balanceDue?.toString() || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [isAdvance, setIsAdvance] = useState(!invoiceId);

  const createPaymentMutation = useCreatePayment();
  const allocatePaymentMutation = useAllocatePayment();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      try {
        const request: CreatePaymentRequest = {
          patientId,
          patientName,
          amount: amountValue,
          currencyCode,
          paymentMethod,
          transactionId: transactionId || undefined,
          isAdvance,
          notes: notes || undefined,
        };

        const payment = await createPaymentMutation.mutateAsync(request);

        // Auto-allocate to invoice if provided
        if (invoiceId && !isAdvance) {
          await allocatePaymentMutation.mutateAsync({
            paymentId: payment.id,
            allocations: [
              {
                invoiceId,
                amount: Math.min(amountValue, balanceDue || amountValue),
              },
            ],
          });
        }

        onSuccess?.(payment.receiptNumber);
      } catch (error) {
        console.error("Failed to process payment:", error);
      }
    },
    [
      amount,
      patientId,
      patientName,
      currencyCode,
      paymentMethod,
      transactionId,
      isAdvance,
      notes,
      invoiceId,
      balanceDue,
      createPaymentMutation,
      allocatePaymentMutation,
      onSuccess,
    ]
  );

  const isProcessing =
    createPaymentMutation.isPending || allocatePaymentMutation.isPending;

  const selectedMethodIcon = PAYMENT_METHOD_OPTIONS.find(
    (m) => m.value === paymentMethod
  )?.icon;
  const MethodIcon = selectedMethodIcon || Banknote;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Record Payment
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </Flex>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Info */}
          <Box className="p-3 bg-muted/50 rounded-lg">
            <Flex align="center" justify="between">
              <Box>
                <p className="font-medium">{patientName}</p>
                {invoiceNumber && (
                  <p className="text-sm text-muted-foreground">
                    Invoice: {invoiceNumber}
                  </p>
                )}
              </Box>
              {balanceDue !== undefined && (
                <Box className="text-right">
                  <p className="text-sm text-muted-foreground">Balance Due</p>
                  <p className="text-lg font-bold text-destructive">
                    {currencyCode} {balanceDue.toFixed(2)}
                  </p>
                </Box>
              )}
            </Flex>
          </Box>

          {/* Amount */}
          <Box>
            <Label htmlFor="amount">Amount ({currencyCode})</Label>
            <Box className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencyCode}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAmount(e.target.value)
                }
                className="pl-14"
                placeholder="0.00"
                required
              />
            </Box>
            {balanceDue !== undefined && parseFloat(amount) > balanceDue && (
              <p className="text-sm text-yellow-600 mt-1">
                Amount exceeds balance due. Excess will be recorded as advance.
              </p>
            )}
          </Box>

          {/* Payment Method */}
          <Box>
            <Label>Payment Method</Label>
            <Box className="grid grid-cols-4 gap-2 mt-1.5">
              {PAYMENT_METHOD_OPTIONS.slice(0, 4).map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.value;
                return (
                  <Button
                    key={method.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "flex-col h-auto py-3",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </Box>
            <Box className="mt-2">
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <Flex gap="sm" align="center">
                    <MethodIcon className="h-4 w-4" />
                    <SelectValue />
                  </Flex>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          </Box>

          {/* Transaction ID (for card/digital payments) */}
          {["card", "bank_transfer", "mobile_payment"].includes(paymentMethod) && (
            <Box>
              <Label htmlFor="transactionId">Transaction ID / Reference</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTransactionId(e.target.value)
                }
                placeholder="Enter transaction reference"
                className="mt-1.5"
              />
            </Box>
          )}

          {/* Cheque Details */}
          {paymentMethod === "cheque" && (
            <Box>
              <Label htmlFor="chequeNumber">Cheque Number</Label>
              <Input
                id="chequeNumber"
                value={transactionId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTransactionId(e.target.value)
                }
                placeholder="Enter cheque number"
                className="mt-1.5"
              />
            </Box>
          )}

          {/* Advance Payment Toggle */}
          {!invoiceId && (
            <Flex align="center" gap="sm">
              <input
                type="checkbox"
                id="isAdvance"
                checked={isAdvance}
                onChange={(e) => setIsAdvance(e.target.checked)}
                className="h-4 w-4 rounded border-muted-foreground"
              />
              <Label htmlFor="isAdvance" className="cursor-pointer">
                Record as advance payment
              </Label>
            </Flex>
          )}

          {/* Notes */}
          <Box>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              className="w-full mt-1.5 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-y"
              rows={2}
            />
          </Box>

          {/* Actions */}
          <Flex gap="sm" justify="end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isProcessing || !amount}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          </Flex>
        </form>
      </CardContent>
    </Card>
  );
});
