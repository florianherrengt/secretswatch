import { z } from "zod";
import type { FC } from "hono/jsx";
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
				<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h1 class="text-2xl font-semibold tracking-tight">Your Domains</h1>

					{props.domains.length === 0 ? (
						<p class="mt-4 text-sm text-gray-600">No domains added yet.</p>
					) : (
						<ul class="mt-4 space-y-2">
							{props.domains.map((item) => {
								return (
									<li class="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
										<span class="text-sm font-medium text-gray-900">{item.domain}</span>
										<form action="/scan" method="post">
											<input type="hidden" name="domain" value={item.domain} />
											<button
												type="submit"
												class="text-sm text-gray-900 underline"
											>
												Scan now
											</button>
										</form>
									</li>
								);
							})}
						</ul>
					)}

					<div class="mt-6 border-t border-gray-200 pt-5">
						<h2 class="text-lg font-semibold tracking-tight">Add Domain</h2>
						<form action="/domains" method="post" class="mt-3 space-y-3">
							<label for="domain" class="block text-sm font-medium text-gray-700">
								Domain
							</label>
							<input
								id="domain"
								name="domain"
								type="text"
								required
								placeholder="example.com"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
							/>
							<button
								type="submit"
								class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
							>
								Add Domain
							</button>
						</form>
					</div>
				</section>
			</Layout>
		);
	});
