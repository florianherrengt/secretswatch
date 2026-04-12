import { z } from "zod";
import type { FC } from "hono/jsx";

export const homePagePropsSchema = z.object({
  domain: z.string().min(1),
  isLoggedIn: z.boolean(),
});

export type HomePageProps = z.infer<typeof homePagePropsSchema>;

const themeCss = `
@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-card: hsl(var(--card));
  --color-border: hsl(var(--border));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
  --color-warning: hsl(var(--warning));
  --color-warning-foreground: hsl(var(--warning-foreground));
  --color-error: hsl(var(--error));
  --color-error-foreground: hsl(var(--error-foreground));
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

@layer base {
  :root {
    --background: 210 20% 98%;
    --foreground: 220 24% 16%;
    --muted: 210 16% 94%;
    --muted-foreground: 215 13% 42%;
    --card: 0 0% 100%;
    --border: 215 16% 88%;
    --primary: 215 25% 27%;
    --primary-foreground: 0 0% 100%;
    --success: 145 38% 38%;
    --success-foreground: 140 42% 96%;
    --warning: 35 80% 45%;
    --warning-foreground: 37 96% 13%;
    --error: 0 58% 45%;
    --error-foreground: 0 70% 97%;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: 222 25% 11%;
      --foreground: 210 20% 94%;
      --muted: 223 18% 16%;
      --muted-foreground: 215 15% 67%;
      --card: 222 23% 14%;
      --border: 220 16% 23%;
      --primary: 210 26% 84%;
      --primary-foreground: 222 38% 12%;
      --success: 145 35% 62%;
      --success-foreground: 145 38% 12%;
      --warning: 39 87% 66%;
      --warning-foreground: 36 80% 13%;
      --error: 0 70% 68%;
      --error-foreground: 0 76% 13%;
    }
  }

  button:not(:disabled) {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
  }
}
`;

export const HomePage: FC<HomePageProps> = z
  .function()
  .args(homePagePropsSchema)
  .returns(z.custom<ReturnType<FC<HomePageProps>>>())
  .implement(({ domain }) => {
    return (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Secret Detector</title>
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
          <style type={"text/tailwindcss" as "text/css"}>{themeCss}</style>
        </head>
        <body class="min-h-screen bg-background font-sans text-foreground">
          <div class="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
            <header class="py-6">
              <div class="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <strong class="text-lg text-foreground">Secret Detector</strong>
                <a
                  href="/domains"
                  class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Dashboard
                </a>
              </div>
            </header>

            {/* eslint-disable-next-line custom/ds-no-unapproved-class-tokens -- ds-exception: UI-102 | flex-1 centers hero within viewport below header */}
            <section class="flex flex-1 items-center justify-center py-8">
              <div class="w-full max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6">
                <div class="mb-6 space-y-2 text-center">
                  <h1 class="text-3xl font-semibold text-foreground">
                    Scan websites for exposed secrets
                  </h1>
                  <p class="text-base text-muted-foreground">
                    Enter any public URL to run a quick security scan.
                  </p>
                </div>
                <form
                  id="scan-form"
                  action="/scan"
                  method="post"
                  class="flex gap-3"
                >
                  <input
                    id="domain"
                    name="domain"
                    type="text"
                    required
                    placeholder="Enter any URL to scan"
                    value={`${domain}/sandbox/demo`}
                    class="w-full rounded-xl border border-border bg-background px-4 py-2 text-base text-foreground"
                  />
                  <button
                    type="submit"
                    class="shrink-0 cursor-pointer rounded-xl bg-primary px-6 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Scan now
                  </button>
                </form>
              </div>
            </section>
          </div>
        </body>
      </html>
    );
  });
