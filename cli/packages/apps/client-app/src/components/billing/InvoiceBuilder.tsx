/**
 * InvoiceBuilder Component
 * Create and manage invoice items before finalizing
 */

import type {
  Invoice,
  InvoiceItem,
  InvoiceType,
  Service,
  AddInvoiceItemRequest,
} from "@lazarus-life/shared/types/billing";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { memo, useState, useCallback } from "react";
import {
  useCreateInvoice,
  useAddInvoiceItem,
  useFinalizeInvoice,
  useInvoice,
} from "@/hooks/api/billing";
import { ServiceSearch } from "./ServiceSearch";

interface InvoiceBuilderProps {
  patientId: string;
  patientName: string;
  patientMrn?: string;
  visitId?: string;
  invoiceType?: InvoiceType;
  onSuccess?: (invoice: Invoice) => void;
  onCancel?: () => void;
  className?: string;
}

const INVOICE_TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: "opd", label: "OPD Visit" },
  { value: "ipd", label: "IPD (Inpatient)" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "laboratory", label: "Laboratory" },
  { value: "radiology", label: "Radiology" },
  { value: "procedure", label: "Procedure" },
  { value: "package", label: "Package" },
  { value: "other", label: "Other" },
];

interface PendingItem {
  service: Service;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export const InvoiceBuilder = memo(function InvoiceBuilder({
  patientId,
  patientName,
  patientMrn,
  visitId,
  invoiceType: defaultInvoiceType = "opd",
  onSuccess,
  onCancel,
  className,
}: InvoiceBuilderProps) {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(defaultInvoiceType);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);

  const createInvoiceMutation = useCreateInvoice();
  const addItemMutation = useAddInvoiceItem();
  const finalizeMutation = useFinalizeInvoice();

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(invoiceId || "");

  const handleAddItem = useCallback(() => {
    if (!selectedService) return;

    setPendingItems((prev) => [
      ...prev,
      {
        service: selectedService,
        quantity,
        unitPrice: selectedService.basePrice,
        discountPercent,
      },
    ]);
    setSelectedService(null);
    setQuantity(1);
    setDiscountPercent(0);
  }, [selectedService, quantity, discountPercent]);

  const handleRemoveItem = useCallback((index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const calculateItemTotal = (item: PendingItem) => {
    const gross = item.unitPrice * item.quantity;
    const discount = (gross * item.discountPercent) / 100;
    return gross - discount;
  };

  const subtotal = pendingItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );

  const handleCreateAndAddItems = useCallback(async () => {
    if (pendingItems.length === 0) return;

    try {
      // Create invoice first
      const newInvoice = await createInvoiceMutation.mutateAsync({
        invoiceType,
        patientId,
        patientName,
        patientMrn,
        visitId,
      });

      setInvoiceId(newInvoice.id);

      // Add all items
      for (const item of pendingItems) {
        const request: AddInvoiceItemRequest = {
          serviceId: item.service.id,
          serviceCode: item.service.code,
          serviceName: item.service.name,
          quantity: item.quantity,
          unit: item.service.unit,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
        };
        await addItemMutation.mutateAsync({
          invoiceId: newInvoice.id,
          item: request,
        });
      }

      setPendingItems([]);
    } catch (error) {
      console.error("Failed to create invoice:", error);
    }
  }, [
    pendingItems,
    invoiceType,
    patientId,
    patientName,
    patientMrn,
    visitId,
    createInvoiceMutation,
    addItemMutation,
  ]);

  const handleFinalize = useCallback(async () => {
    if (!invoiceId) return;

    try {
      const finalizedInvoice = await finalizeMutation.mutateAsync(invoiceId);
      onSuccess?.(finalizedInvoice);
    } catch (error) {
      console.error("Failed to finalize invoice:", error);
    }
  }, [invoiceId, finalizeMutation, onSuccess]);

  const isCreating =
    createInvoiceMutation.isPending || addItemMutation.isPending;
  const isFinalizing = finalizeMutation.isPending;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            New Invoice
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </Flex>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Patient Info */}
        <Box className="p-3 bg-muted/50 rounded-lg">
          <Flex align="center" justify="between">
            <Box>
              <p className="font-medium">{patientName}</p>
              {patientMrn && (
                <p className="text-sm text-muted-foreground font-mono">
                  MRN: {patientMrn}
                </p>
              )}
            </Box>
            <Select
              value={invoiceType}
              onValueChange={(v) => setInvoiceType(v as InvoiceType)}
              disabled={!!invoiceId}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Flex>
        </Box>

        {/* Add Service */}
        {!invoiceId && (
          <Box className="space-y-4">
            <Label>Add Service</Label>
            <Flex gap="sm" align="end">
              <Box className="flex-1">
                <ServiceSearch
                  value={selectedService}
                  onSelect={setSelectedService}
                  placeholder="Search for a service..."
                />
              </Box>
              {selectedService && (
                <>
                  <Box className="w-20">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setQuantity(parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </Box>
                  <Box className="w-24">
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDiscountPercent(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </Box>
                  <Button onClick={handleAddItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </Flex>
          </Box>
        )}

        {/* Pending Items Table */}
        {pendingItems.length > 0 && !invoiceId && (
          <Box className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box>
                        <p className="font-medium">{item.service.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {item.service.code}
                        </p>
                      </Box>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.service.baseCurrencyCode} {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.service.baseCurrencyCode}{" "}
                      {calculateItemTotal(item).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Subtotal */}
            <Box className="p-3 bg-muted/50 border-t">
              <Flex justify="between" align="center">
                <span className="font-medium">Subtotal</span>
                <span className="text-lg font-bold">
                  {pendingItems[0]?.service.baseCurrencyCode || "USD"}{" "}
                  {subtotal.toFixed(2)}
                </span>
              </Flex>
            </Box>
          </Box>
        )}

        {/* Invoice Items (after creation) */}
        {invoiceId && invoice && (
          <Box className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box>
                        <p className="font-medium">{item.serviceName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {item.serviceCode}
                        </p>
                      </Box>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.currencyCode} {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.discountAmount > 0 ? (
                        <span className="text-green-600">
                          -{item.currencyCode} {item.discountAmount.toFixed(2)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalTax > 0 ? (
                        <Box>
                          <p>{item.currencyCode} {item.totalTax.toFixed(2)}</p>
                          <Box className="flex gap-1 justify-end">
                            {item.taxLines.map((tax) => (
                              <Badge
                                key={tax.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {tax.componentCode} {tax.taxRate}%
                              </Badge>
                            ))}
                          </Box>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.currencyCode} {item.totalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Invoice Totals */}
            <Box className="p-4 bg-muted/50 border-t space-y-2">
              <Flex justify="between">
                <span>Subtotal</span>
                <span>
                  {invoice.currencyCode} {invoice.subtotal.toFixed(2)}
                </span>
              </Flex>
              {invoice.discountAmount > 0 && (
                <Flex justify="between" className="text-green-600">
                  <span>Discount</span>
                  <span>
                    -{invoice.currencyCode} {invoice.discountAmount.toFixed(2)}
                  </span>
                </Flex>
              )}
              {invoice.totalTax > 0 && (
                <Flex justify="between">
                  <span>Tax</span>
                  <span>
                    {invoice.currencyCode} {invoice.totalTax.toFixed(2)}
                  </span>
                </Flex>
              )}
              <Flex justify="between" className="pt-2 border-t font-bold text-lg">
                <span>Grand Total</span>
                <span>
                  {invoice.currencyCode} {invoice.grandTotal.toFixed(2)}
                </span>
              </Flex>
            </Box>
          </Box>
        )}

        {/* Loading State */}
        {invoiceId && invoiceLoading && (
          <Flex justify="center" className="py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Flex>
        )}

        {/* Actions */}
        <Flex gap="sm" justify="end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating || isFinalizing}
            >
              Cancel
            </Button>
          )}

          {!invoiceId && pendingItems.length > 0 && (
            <Button onClick={handleCreateAndAddItems} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Create Invoice
            </Button>
          )}

          {invoiceId && invoice && !invoice.isFinalized && (
            <Button onClick={handleFinalize} disabled={isFinalizing}>
              {isFinalizing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Finalize Invoice
            </Button>
          )}

          {invoiceId && invoice?.isFinalized && (
            <Badge variant="default" className="py-2 px-4">
              Invoice Finalized - #{invoice.invoiceNumber}
            </Badge>
          )}
        </Flex>
      </CardContent>
    </Card>
  );
});
