import { z } from "zod";
import type { FC } from "hono/jsx";
import { ScanCard } from "../components/ScanCard.js";
import { Section } from "../components/Section.js";
import { Layout } from "../layout.js";

export const homePagePropsSchema = z.object({
	domain: z.string().min(1),
	isLoggedIn: z.boolean()
});

export type HomePageProps = z.infer<typeof homePagePropsSchema>;

export const HomePage: FC<HomePageProps> = z
	.function()
	.args(homePagePropsSchema)
	.returns(z.custom<ReturnType<FC<HomePageProps>>>())
	.implement(({ domain, isLoggedIn }) => {
		return (
			<Layout title="Home" topNavMode={isLoggedIn ? "app" : "auth"}>
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Secret Detector</h1>
					<Section title="Run Scan" description="Submit a domain target to enqueue an async scan and persist findings.">
						<ScanCard>
							<p class="text-sm text-muted-foreground">
								Need end-to-end dedupe diagnostics? Use the <a href="/dedupe" class="underline">dedupe debug tool</a>.
							</p>
							<form action="/scan" method="post" class="space-y-3">
								<label for="domain" class="block text-sm font-medium text-foreground">
									Domain target
								</label>
								<input
									id="domain"
									name="domain"
									type="text"
									required
									placeholder={`${domain}/sandbox/demo`}
									class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
								/>
								<button
									type="submit"
									class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Run scan
								</button>
							</form>
						</ScanCard>
					</Section>

					<Section title="Demo Website" description="Open the sandbox demo website or run a scan against it.">
						<div class="rounded-md border border-border bg-card p-4">
							<p class="text-sm font-medium text-foreground">Security issues demo website</p>
							<div class="mt-2 flex gap-3">
								<a href="/sandbox/demo" class="text-sm text-foreground underline">
									Open site
								</a>
								<form action="/scan" method="post">
									<input type="hidden" name="domain" value={`${domain}/sandbox/demo`} />
									<button type="submit" class="text-sm text-foreground underline">
										Scan with tool
									</button>
								</form>
							</div>
						</div>
					</Section>
				</div>
			</Layout>
		);
	});
