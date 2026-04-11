import { z } from "zod";
import type { FC } from "hono/jsx";
import { Divider } from "../components/Divider.js";
import { ScanCard } from "../components/ScanCard.js";
import { Section } from "../components/Section.js";
import { Layout } from "../layout.js";

export const domainListItemSchema = z.object({
	id: z.string().uuid(),
	domain: z.string()
});

export const domainListPagePropsSchema = z.object({
	domains: z.array(domainListItemSchema)
});

export type DomainListPageProps = z.infer<typeof domainListPagePropsSchema>;

export const DomainListPage: FC<DomainListPageProps> = z
	.function()
	.args(domainListPagePropsSchema)
	.returns(z.custom<ReturnType<FC<DomainListPageProps>>>())
	.implement((props) => {
		return (
			<Layout title="Your Domains">
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Your Domains</h1>
					<Section title="Saved Domains">
						<ScanCard>
							{props.domains.length === 0 ? (
								<p class="text-sm text-muted-foreground">No domains added yet.</p>
							) : (
								<ul class="space-y-2">
									{props.domains.map((item) => {
										return (
											<li class="flex items-center justify-between rounded-md border border-border px-4 py-3">
												<span class="text-sm font-medium text-foreground">{item.domain}</span>
												<form action="/scan" method="post">
													<input type="hidden" name="domain" value={item.domain} />
													<button type="submit" class="text-sm text-foreground underline">
														Scan now
													</button>
												</form>
											</li>
										);
									})}
								</ul>
							)}
						</ScanCard>
					</Section>

					<Divider />

					<Section title="Add Domain">
						<ScanCard>
							<form action="/domains" method="post" class="space-y-3">
								<label for="domain" class="block text-sm font-medium text-foreground">
									Domain
								</label>
								<input
									id="domain"
									name="domain"
									type="text"
									required
									placeholder="example.com"
									class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
								/>
								<button
									type="submit"
									class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Add Domain
								</button>
							</form>
						</ScanCard>
					</Section>
				</div>
			</Layout>
		);
	});
