/**
 * Permission Assignment Dialog
 * Dialog for assigning permissions to users, roles, or groups
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectItem,
  SelectValue,
} from "@lazarus-life/ui-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type AssignPermissionRequest, assignPermission } from "../../lib/api/permissions";

interface AssignPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubject?: string;
  defaultRelation?: string;
  defaultObject?: string;
}

export function AssignPermissionDialog({
  open,
  onOpenChange,
  defaultSubject,
  defaultRelation,
  defaultObject,
}: AssignPermissionDialogProps) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(defaultSubject || "");
  const [subjectType, setSubjectType] = useState<"user" | "role" | "group">("user");
  const [relation, setRelation] = useState(defaultRelation || "can_view");
  const [object, setObject] = useState(defaultObject || "");
  const [expiresAt, setExpiresAt] = useState("");
  const [validFrom, setValidFrom] = useState("");

  const mutation = useMutation({
    mutationFn: (request: AssignPermissionRequest) => assignPermission(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      queryClient.invalidateQueries({ queryKey: ["userPermissions"] });
      onOpenChange(false);
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject || "");
      setSubjectType("user");
      setRelation(defaultRelation || "can_view");
      setObject(defaultObject || "");
      setExpiresAt("");
      setValidFrom("");
    }
  }, [open, defaultSubject, defaultRelation, defaultObject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subjectStr =
      subjectType === "user"
        ? `user:${subject}`
        : subjectType === "role"
          ? `role:${subject}`
          : `group:${subject}`;

    mutation.mutate({
      subject: subjectStr,
      relation,
      object,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      valid_from: validFrom ? new Date(validFrom).toISOString() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Permission</DialogTitle>
            <DialogDescription>
              Assign a permission to a user, role, or group using Zanzibar relationships
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject-type">Subject Type</Label>
              <Select
                id="subject-type"
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as "user" | "role" | "group")}
              >
                <SelectValue placeholder="Select type" />
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </Select>
            </div>

            <Input
              label={
                subjectType === "user"
                  ? "User ID"
                  : subjectType === "role"
                    ? "Role Name"
                    : "Group ID"
              }
              id="subject"
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              placeholder={
                subjectType === "user" ? "user-id" : subjectType === "role" ? "admin" : "group-id"
              }
              required={true}
            />

            <div className="grid gap-2">
              <Label htmlFor="relation">Relation</Label>
              <Select id="relation" value={relation} onChange={(e) => setRelation(e.target.value)}>
                <SelectValue placeholder="Select relation" />
                <SelectItem value="can_view">Can View</SelectItem>
                <SelectItem value="can_edit">Can Edit</SelectItem>
                <SelectItem value="can_click">Can Click</SelectItem>
                <SelectItem value="can_call">Can Call</SelectItem>
                <SelectItem value="can_create">Can Create</SelectItem>
                <SelectItem value="can_delete">Can Delete</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="has_role">Has Role</SelectItem>
              </Select>
            </div>

            <Input
              label="Object (Resource)"
              id="object"
              value={object}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObject(e.target.value)}
              placeholder="page:users, button:create-user, field:user-email, etc."
              required={true}
            />

            <Input
              label="Valid From (Optional)"
              id="valid-from"
              type="datetime-local"
              value={validFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValidFrom(e.target.value)}
            />

            <Input
              label="Expires At (Optional)"
              id="expires-at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresAt(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Assigning..." : "Assign Permission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
