import { z } from "zod";
import type { FC } from "hono/jsx";
import { Layout } from "../layout.js";
import { Section } from "../components/Section.js";
import { ScanCard } from "../components/ScanCard.js";

type AdminPageProps = Record<string, never>;

const adminPagePropsSchema = z.custom<AdminPageProps>();

export const AdminPage: FC<AdminPageProps> = z
	.function()
	.args(adminPagePropsSchema)
	.returns(z.custom<ReturnType<FC<AdminPageProps>>>())
	.implement(() => {
		return (
			<Layout title="Admin" topNavMode="app">
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Admin</h1>
					<Section title="Tools">
						<ScanCard>
							<ul class="space-y-3">
								<li>
									<a
										href="/admin/queues"
										class="text-sm font-medium text-primary"
									>
										Queue Monitor
									</a>
									<p class="text-sm text-muted-foreground">View BullMQ job queues and retry failed scans</p>
								</li>
							</ul>
						</ScanCard>
					</Section>
				</div>
			</Layout>
		);
	});
