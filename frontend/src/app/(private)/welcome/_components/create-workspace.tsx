"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OrganizationLogoUpload } from "@/components/ui/organization-logo-upload";
import { useCreateOrganizationMutation } from "@/hooks/use-organization-mutations";
import type { CreateOrganizationRequest } from "@/app/_actions/organizations";
import { useState } from "react";

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
});

type CreateOrganizationForm = z.infer<typeof createOrganizationSchema>;

interface CreateWorkspaceProps {
  onBack: () => void;
  onSuccess?: (organization: any) => void;
  isModal?: boolean;
}

export function CreateWorkspace({
  onBack,
  onSuccess,
  isModal = false,
}: CreateWorkspaceProps) {
  const { createOrganization, isPending } = useCreateOrganizationMutation();
  const [logoUrl, setLogoUrl] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateOrganizationForm>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      description: "",
      logoUrl: "",
    },
  });

  const organizationName = watch("name") || "New Workspace";

  const onSubmit = async (data: CreateOrganizationForm) => {
    try {
      // Clean up empty strings to undefined
      const cleanData: CreateOrganizationRequest = {
        name: data.name,
        description: data.description || undefined,
        logoUrl: logoUrl || undefined,
      };

      const result = await createOrganization(cleanData);

      // Handle success
      reset();
      setLogoUrl("");
      onSuccess?.(result);
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error("Create organization error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isModal ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isModal ? 0 : -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={isModal ? "w-full" : "w-full max-w-lg"}
    >
      {/* Card */}
      <div
        className={isModal ? "space-y-6" : "bg-card rounded-lg p-8 space-y-6"}
      >
        {/* Header with Back Button */}
        <div className="space-y-4">
          {!isModal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to workspaces
            </Button>
          )}

          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Create new workspace
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Set up a new workspace to organize your team and projects.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Logo Upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <label className="block text-sm font-medium mb-2">
              Workspace Logo
            </label>
            <OrganizationLogoUpload
              currentLogoUrl={logoUrl}
              organizationName={organizationName}
              onLogoChange={setLogoUrl}
              disabled={isPending}
              size="md"
            />
          </motion.div>

          {/* Organization Name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Input
              label="Workspace Name"
              placeholder="Enter workspace name"
              disabled={isPending}
              required
              errorText={errors.name?.message}
              isInvalid={!!errors.name}
              {...register("name")}
            />
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Textarea
              label="Description"
              placeholder="Brief description of your workspace"
              rows={3}
              disabled={isPending}
              errorText={errors.description?.message}
              isInvalid={!!errors.description}
              {...register("description")}
            />
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <div className="flex gap-3">
              {isModal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
                className={isModal ? "flex-1" : "w-full"}
                isLoading={isPending}
                loadingText="Creating..."
              >
                Create Workspace
              </Button>
            </div>
          </motion.div>
        </form>

        {/* Footer */}
        {!isModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4 border-t border-border"
          >
            <p className="text-xs text-muted-foreground text-center">
              Need help? Contact your system administrator
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
