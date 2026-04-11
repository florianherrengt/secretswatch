import { z } from "zod";
import type { FC } from "hono/jsx";

const statusBadgeVariantSchema = z.enum(["success", "error", "warning", "neutral"]);
const statusBadgeStatusSchema = z.enum(["success", "failed", "running", "idle", "passed", "pending"]);

export type StatusBadgeVariant = z.infer<typeof statusBadgeVariantSchema>;
export type StatusBadgeStatus = z.infer<typeof statusBadgeStatusSchema>;

const statusToVariant = {
	success: "success",
	failed: "error",
	running: "neutral",
	idle: "neutral",
	passed: "success",
	pending: "neutral"
} as const satisfies Record<StatusBadgeStatus, StatusBadgeVariant>;

const statusToLabel = {
	success: "success",
	failed: "failed",
	running: "running",
	idle: "idle",
	passed: "success",
	pending: "running"
} as const satisfies Record<StatusBadgeStatus, string>;

const variantClassMap = {
	success: "border-success/25 bg-success/10 text-success",
	error: "border-error/25 bg-error/10 text-error",
	warning: "border-warning/25 bg-warning/10 text-warning",
	neutral: "border-border bg-muted text-muted-foreground"
} as const satisfies Record<StatusBadgeVariant, string>;

const statusClassMap = {
	success: variantClassMap.success,
	failed: variantClassMap.error,
	running: "border-primary/30 bg-primary/10 text-primary",
	idle: variantClassMap.neutral,
	passed: variantClassMap.success,
	pending: "border-primary/30 bg-primary/10 text-primary"
} as const satisfies Record<StatusBadgeStatus, string>;

const statusBadgePropsSchema = z.object({
	label: z.string().trim().min(1).optional(),
	variant: statusBadgeVariantSchema.optional(),
	status: statusBadgeStatusSchema.optional(),
	class: z.string().optional()
});

export type StatusBadgeProps = z.infer<typeof statusBadgePropsSchema>;

export const StatusBadge: FC<StatusBadgeProps> = z
	.function()
	.args(statusBadgePropsSchema)
	.returns(z.custom<ReturnType<FC<StatusBadgeProps>>>())
	.implement(({ label, variant, status, class: classValue }) => {
		const resolvedVariant = status ? statusToVariant[status] : (variant ?? "neutral");
		const resolvedLabel = label ?? (status ? statusToLabel[status] : resolvedVariant);
		const toneClass = status ? statusClassMap[status] : variantClassMap[resolvedVariant];
		const classes = [
			"inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-medium capitalize",
			toneClass,
			classValue ?? ""
		]
			.join(" ")
			.trim();

		return (
			<span class={classes}>
				{resolvedLabel}
			</span>
		);
	});
