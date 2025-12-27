import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { type Regulation, type RegulationStatus, regulationsApi } from "@/lib/api/compliance";

export function RegulationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, _setStatusFilter] = useState<RegulationStatus | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch regulations
  const { data: regulations, isLoading } = useQuery({
    queryKey: ["regulations", statusFilter],
    queryFn: () => regulationsApi.list(statusFilter),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: regulationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulations"] });
      setIsCreateDialogOpen(false);
    },
  });

  const filteredRegulations =
    regulations?.filter(
      (reg) =>
        reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.code.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <Stack spacing="lg">
      <Stack spacing="xs">
        <h1 className="text-3xl font-bold">{t("compliance.regulations.title")}</h1>
        <p className="text-muted-foreground">{t("compliance.regulations.description")}</p>
      </Stack>

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("compliance.regulations.search")}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("compliance.regulations.create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regulations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.regulations.list")}</CardTitle>
          <CardDescription>
            {t("compliance.regulations.count", { count: filteredRegulations.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("compliance.regulations.code")}</TableHead>
                  <TableHead>{t("compliance.regulations.name")}</TableHead>
                  <TableHead>{t("compliance.regulations.category")}</TableHead>
                  <TableHead>{t("compliance.regulations.status")}</TableHead>
                  <TableHead>{t("compliance.regulations.issuingBody")}</TableHead>
                  <TableHead>{t("compliance.regulations.effectiveFrom")}</TableHead>
                  <TableHead>{t("compliance.regulations.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegulations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {t("compliance.regulations.noRegulations")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegulations.map((regulation) => (
                    <TableRow key={regulation.id}>
                      <TableCell className="font-mono">{regulation.code}</TableCell>
                      <TableCell className="font-medium">{regulation.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{regulation.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            regulation.status === "active"
                              ? "default"
                              : regulation.status === "draft"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {regulation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{regulation.issuing_body}</TableCell>
                      <TableCell>
                        {new Date(regulation.effective_from).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Regulation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("compliance.regulations.create")}</DialogTitle>
            <DialogDescription>{t("compliance.regulations.createDescription")}</DialogDescription>
          </DialogHeader>
          <CreateRegulationForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

interface CreateRegulationFormProps {
  onSubmit: (data: Omit<Regulation, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function CreateRegulationForm({ onSubmit, onCancel, isLoading }: CreateRegulationFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "other" as Regulation["category"],
    issuing_body: "",
    status: "draft" as RegulationStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      effective_from: new Date().toISOString(),
      metadata: {},
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing="md" className="py-4">
        <Input
          label={t("compliance.regulations.code")}
          value={formData.code}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
          placeholder="HIPAA"
          required
        />
        <Input
          label={t("compliance.regulations.name")}
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Health Insurance Portability and Accountability Act"
          required
        />
        <Input
          label={t("compliance.regulations.issuingBody")}
          value={formData.issuing_body}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, issuing_body: e.target.value })}
          placeholder="HHS"
          required
        />
      </Stack>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("common.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
