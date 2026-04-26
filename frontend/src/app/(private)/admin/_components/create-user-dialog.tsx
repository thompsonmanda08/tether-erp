"use client";

import {
  PencilLine,
  Plus,
  Check,
  Copy,
  UserCog,
} from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";

import { User, UserType } from "@/types";
import { generateRandomString } from "@/lib/utils";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users-mutations";
import { useActiveDepartments } from "@/hooks/use-department-queries";
import { useActiveRoles } from "@/hooks/use-role-queries";
import { useActiveBranches } from "@/hooks/use-branch-queries";
import { usePermissions } from "@/hooks/use-permissions";

type FormData = {
  first_name: string;
  last_name: string;
  email: string;
  role: UserType;
  department_id?: string;
  department?: string;
  branch_id?: string;
  is_active: boolean;
  password?: string;
  position: string;
  manNumber: string;
  nrcNumber: string;
  contact: string;
};

export default function CreateUserForm({
  role,
  user,
  showTrigger,
  isOpenModal,
  setIsOpenModal,
}: {
  showTrigger?: boolean;
  role: UserType;
  user: User | null;
  isOpenModal?: boolean;
  setIsOpenModal?: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isEditMode = !!user;
  const dialogOpen = showTrigger ? internalOpen : isOpenModal;
  const setDialogOpen = showTrigger ? setInternalOpen : setIsOpenModal;

  const { isAdmin, isLoading: permissionsLoading } = usePermissions();

  const createUserMutation = useCreateUser(() => {
    handleCloseModal();
    setTimeout(() => router.refresh(), 500);
  });
  const updateUserMutation = useUpdateUser(() => {
    handleCloseModal();
    router.refresh();
  });

  const { data: departmentsData = [], isLoading: isDepartmentsLoading } = useActiveDepartments();
  const { data: branchesData = [], isLoading: isBranchesLoading } = useActiveBranches();
  const { data: rolesData = [], isLoading: isRolesLoading, error: rolesError } = useActiveRoles();

  const initialFormState: FormData = useMemo(() => {
    if (isEditMode && user) {
      return {
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        role: user.role || role,
        department_id: user.department_id || "",
        branch_id: (user as any).branch_id || "",
        is_active: user.is_active ?? true,
        password: "",
        position: user.position || "",
        manNumber: user.manNumber || "",
        nrcNumber: user.nrcNumber || "",
        contact: user.contact || "",
      };
    }
    return {
      first_name: "",
      last_name: "",
      email: "",
      role: role,
      department_id: "",
      branch_id: "",
      is_active: true,
      password: generateRandomString(),
      position: "",
      manNumber: "",
      nrcNumber: "",
      contact: "",
    };
  }, [isEditMode, user?.id, role]);

  const [formData, setFormData] = useState<FormData>(initialFormState as FormData);

  const departments = useMemo(() => departmentsData.filter((d) => d.is_active), [departmentsData]);

  const allRoles = useMemo(() => {
    if (!rolesData || !Array.isArray(rolesData)) return [];
    return rolesData.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.isDefault ? "system" : "custom",
      description: r.description,
    }));
  }, [rolesData]);

  useEffect(() => {
    if (isEditMode && user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        role: user.role || role,
        department: user.department || "",
        department_id: user.department_id || "",
        branch_id: (user as any).branch_id || "",
        is_active: user.is_active ?? true,
        password: "",
        position: user.position || "",
        manNumber: user.manNumber || "",
        nrcNumber: user.nrcNumber || "",
        contact: user.contact || "",
      });
    } else if (!isEditMode && dialogOpen) {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        role: role,
        department: "",
        department_id: "",
        branch_id: "",
        is_active: true,
        password: generateRandomString(),
        position: "",
        manNumber: "",
        nrcNumber: "",
        contact: "",
      });
    }
  }, [user?.id, dialogOpen, isEditMode, role]);

  if (!mounted || permissionsLoading) return null;
  if (rolesError) console.error("Roles loading error:", rolesError);

  if (!isAdmin()) {
    if (showTrigger) {
      return (
        <Button size="sm" disabled onClick={() => toast.error("Only administrators can manage users")}>
          <UserCog className="mr-2 h-4 w-4" />
          {user ? "Update User" : "Create New User"} (Admin Only)
        </Button>
      );
    }
    return null;
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password || "");
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy password");
    }
  };

  const handleGenerateNewPassword = () => {
    setFormData((prev) => ({ ...prev, password: generateRandomString() }));
    setCopied(false);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setCopied(false);
  };

  const handleCloseModal = () => {
    resetForm();
    setDialogOpen?.(false);
  };

  const validateForm = (): boolean => {
    if (!formData.first_name.trim()) { toast.error("First name is required"); return false; }
    if (!formData.last_name.trim()) { toast.error("Last name is required"); return false; }
    if (!formData.email.trim()) { toast.error("Email is required"); return false; }
    if (!formData.role) { toast.error("Role is required"); return false; }
    if (!isEditMode && !formData.password?.trim()) { toast.error("Password is required"); return false; }
    if (!formData.position?.trim()) { toast.error("Position is required"); return false; }
    if (!formData.manNumber?.trim()) { toast.error("Man Number is required"); return false; }
    if (!formData.nrcNumber?.trim()) { toast.error("NRC Number is required"); return false; }
    if (!formData.contact?.trim()) { toast.error("Contact is required"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      if (isEditMode) {
        await updateUserMutation.mutateAsync({
          userId: user!.id,
          data: {
            name: fullName,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            department_id: formData.department_id,
            branch_id: formData.branch_id || null,
            is_active: formData.is_active,
            role: formData.role,
            position: formData.position,
            manNumber: formData.manNumber,
            nrcNumber: formData.nrcNumber,
            contact: formData.contact,
          },
        });
      } else {
        await createUserMutation.mutateAsync({
          name: fullName,
          email: formData.email,
          password: formData.password || generateRandomString(12),
          first_name: formData.first_name,
          last_name: formData.last_name,
          department_id: formData.department_id || "",
          branch_id: formData.branch_id || undefined,
          role: formData.role,
          position: formData.position,
          manNumber: formData.manNumber,
          nrcNumber: formData.nrcNumber,
          contact: formData.contact,
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (showTrigger) {
          if (open) setInternalOpen(true);
          else handleCloseModal();
        } else {
          if (!open) handleCloseModal();
        }
      }}
    >
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm">
            {user ? (
              <><PencilLine className="mr-2 h-4 w-4" /> Update User</>
            ) : (
              <><Plus className="mr-2 h-4 w-4" />Create New User</>
            )}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] w-full overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 text-primary hover:bg-primary/10 flex h-7 w-7 items-center justify-center rounded-full">
              <UserCog className="h-4 w-4" />
            </div>
            <DialogTitle>
              {isEditMode ? "Edit User" : "Create New User"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="overflow-y-auto grid gap-4 px-6 py-6">

            <div className="flex gap-4">
              <Input
                id="first_name"
                placeholder="Bob"
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                disabled={isSubmitting}
                required
              />
              <Input
                id="last_name"
                label="Last Name"
                placeholder="Mwale"
                value={formData.last_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                disabled={isSubmitting}
                required
              />
            </div>

            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="mail@company.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={isSubmitting}
              required
            />

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <SelectField
                label="Department"
                value={formData.department_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, department_id: value }))}
                isDisabled={isSubmitting || isDepartmentsLoading}
                isLoading={isDepartmentsLoading}
                placeholder="Select department"
                options={departments.map((dept) => ({ id: dept.id, name: dept.name, value: dept.id }))}
              />
              <SelectField
                label="Branch"
                value={formData.branch_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, branch_id: value }))}
                isDisabled={isSubmitting || isBranchesLoading}
                isLoading={isBranchesLoading}
                placeholder="Select branch"
                options={branchesData.map((branch) => ({ id: branch.id, name: branch.name, value: branch.id }))}
              />
            </div>

            <SelectField
              label="Role"
              required
              value={formData.role}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as UserType }))}
              isDisabled={isSubmitting || isRolesLoading}
              isLoading={isRolesLoading}
              placeholder={
                rolesError ? "Error loading roles" : allRoles.length === 0 ? "No roles available" : "Select role"
              }
              options={allRoles.map((r) => ({ id: r.id, name: r.name, value: r.name }))}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="position"
                label="Position"
                placeholder="e.g., Procurement Officer"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                disabled={isSubmitting}
                required
              />
              <Input
                id="manNumber"
                label="Man Number"
                placeholder="e.g., MAN12345"
                value={formData.manNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, manNumber: e.target.value }))}
                disabled={isSubmitting}
                required
              />
              <Input
                id="nrcNumber"
                label="NRC Number"
                placeholder="e.g., 123456/78/9"
                value={formData.nrcNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, nrcNumber: e.target.value }))}
                disabled={isSubmitting}
                required
              />
              <Input
                id="contact"
                label="Contact"
                placeholder="e.g., +260 97 1234567"
                value={formData.contact}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
                disabled={isSubmitting}
                required
              />
            </div>

            {isEditMode && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Account Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_active ? "Account is active" : "Account is deactivated"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {!isEditMode && (
              <div className="flex w-full flex-col items-center gap-2 sm:flex-row">
                <div className="relative flex w-full items-end gap-2">
                  <Input
                    id="password"
                    label="Password"
                    placeholder="************"
                    required
                    value={formData.password}
                    readOnly
                    className="cursor-default font-mono text-sm pr-10"
                    disabled={isSubmitting}
                    endContent={
                      <Button
                        type="button"
                        variant="link"
                        size="icon"
                        onClick={handleCopyPassword}
                        className="hover:bg-muted/5 absolute right-1 shrink-0"
                        disabled={isSubmitting}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </Button>
                    }
                  />
                  <Button type="button" onClick={handleGenerateNewPassword} disabled={isSubmitting}>
                    Generate new password
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-3 border-t p-4">
            <div className="flex w-full items-center justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText={isEditMode ? "Updating..." : "Creating..."}
              >
                {isEditMode ? "Update User" : "Create User"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateUserButton({ role }: { role: UserType }) {
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  if (permissionsLoading) return null;
  if (!isAdmin()) {
    return (
      <Button size="sm" disabled onClick={() => toast.error("Only administrators can manage users")}>
        <Plus className="mr-2 h-4 w-4" />
        Create New User (Admin Only)
      </Button>
    );
  }
  return <CreateUserForm showTrigger={true} role={role} user={null} />;
}
