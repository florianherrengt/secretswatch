// .opencode/plugins/improvement-loop.ts
import { type Plugin, tool } from "@opencode-ai/plugin";

type Proposal = {
  title: string;
  summary: string;
  impact: number; // 0..1
  confidence: number; // 0..1
  risk: number; // 0..1
  testability: number; // 0..1
  category:
    | "correctness"
    | "maintainability"
    | "performance"
    | "security"
    | "other";
};

type IterationRecord = {
  iteration: number;
  selectedProposal: Proposal;
  selectedScore: number;
  outcome:
    | {
        status: "success";
        verification: {
          lint: "pass" | "fail" | "not_run";
          tsc: "pass" | "fail" | "not_run";
          tests: "pass" | "fail" | "not_run";
        };
        changedFiles: string[];
        summary: string;
      }
    | {
        status: "failed";
        verification: {
          lint: "pass" | "fail" | "not_run";
          tsc: "pass" | "fail" | "not_run";
          tests: "pass" | "fail" | "not_run";
        };
        changedFiles: string[];
        summary: string;
      };
};

type LoopState = {
  id: string;
  cwd: string;
  maxIterations: number;
  scoreThreshold: number;
  noValueStreakLimit: number;
  lowScoreStreak: number;
  iterationCount: number;
  history: IterationRecord[];
  status: "running" | "stopped";
  stopReason?: string;
};

const loopStore = new Map<string, LoopState>();

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeProposal(input: Proposal): Proposal {
  return {
    ...input,
    impact: clamp01(input.impact),
    confidence: clamp01(input.confidence),
    risk: clamp01(input.risk),
    testability: clamp01(input.testability),
  };
}

function isLowValueProposal(proposal: Proposal): boolean {
  const text = `${proposal.title} ${proposal.summary}`.toLowerCase();

  const lowValuePatterns = [
    "rename variable",
    "rename variables",
    "rename function",
    "rename functions",
    "reformat",
    "formatting",
    "cosmetic",
    "cleanup comments",
    "comment cleanup",
    "minor cleanup",
    "tiny optimization",
    "micro optimization",
    "speculative optimization",
    "style only",
    "stylistic",
  ];

  return lowValuePatterns.some((pattern) => text.includes(pattern));
}

function scoreProposal(proposal: Proposal): number {
  const categoryBonus =
    proposal.category === "correctness" || proposal.category === "security"
      ? 0.05
      : proposal.category === "performance" ||
          proposal.category === "maintainability"
        ? 0.02
        : 0;

  const raw =
    proposal.impact * 0.4 +
    proposal.confidence * 0.3 +
    proposal.testability * 0.2 -
    proposal.risk * 0.15 +
    categoryBonus;

  return Math.max(0, Math.min(1, raw));
}

function proposalLooksRepeated(loop: LoopState, proposal: Proposal): boolean {
  const candidate = `${proposal.title} ${proposal.summary}`
    .trim()
    .toLowerCase();

  return loop.history.some((record) => {
    const previous =
      `${record.selectedProposal.title} ${record.selectedProposal.summary}`
        .trim()
        .toLowerCase();

    return previous === candidate;
  });
}

function createLoopId(cwd: string): string {
  return `loop:${cwd}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export const ImprovementLoopPlugin: Plugin = async ({ client }) => {
  await client.app.log({
    body: {
      service: "improvement-loop",
      level: "info",
      message: "Improvement loop plugin initialized",
    },
  });

  return {
    tool: {
      start_improvement_loop: tool({
        description:
          "Start a bounded code-improvement loop. Use this once at the beginning of an autonomous improvement session.",
        args: {
          maxIterations: tool.schema
            .number()
            .min(1)
            .max(20)
            .default(5)
            .describe("Maximum number of iterations allowed"),
          scoreThreshold: tool.schema
            .number()
            .min(0)
            .max(1)
            .default(0.6)
            .describe("Minimum proposal score required to continue"),
          noValueStreakLimit: tool.schema
            .number()
            .min(1)
            .max(10)
            .default(2)
            .describe("Stop after this many consecutive low-value iterations"),
        },
        async execute(args, context) {
          const loop: LoopState = {
            id: createLoopId(context.directory),
            cwd: context.directory,
            maxIterations: args.maxIterations,
            scoreThreshold: args.scoreThreshold,
            noValueStreakLimit: args.noValueStreakLimit,
            lowScoreStreak: 0,
            iterationCount: 0,
            history: [],
            status: "running",
          };

          loopStore.set(loop.id, loop);

          return {
            loopId: loop.id,
            status: loop.status,
            message:
              "Improvement loop started. Next, generate up to 3 substantial proposals and call evaluate_improvement_proposals.",
            policy: {
              maxIterations: loop.maxIterations,
              scoreThreshold: loop.scoreThreshold,
              noValueStreakLimit: loop.noValueStreakLimit,
              rules: [
                "Prefer correctness, security, maintainability, or measurable performance improvements.",
                "Reject cosmetic-only, formatting-only, or rename-only ideas.",
                "Do not repeat previously attempted ideas.",
                "Implement at most one proposal per iteration.",
                "Run verification before recording the result.",
              ],
            },
          };
        },
      }),

      evaluate_improvement_proposals: tool({
        description:
          "Evaluate up to 3 candidate improvements, select the best one, or stop the loop if no strong proposal remains.",
        args: {
          loopId: tool.schema
            .string()
            .describe("The loop ID returned by start_improvement_loop"),
          proposals: tool.schema
            .array(
              tool.schema.object({
                title: tool.schema.string().min(1),
                summary: tool.schema.string().min(1),
                impact: tool.schema.number().min(0).max(1),
                confidence: tool.schema.number().min(0).max(1),
                risk: tool.schema.number().min(0).max(1),
                testability: tool.schema.number().min(0).max(1),
                category: tool.schema.enum([
                  "correctness",
                  "maintainability",
                  "performance",
                  "security",
                  "other",
                ]),
              }),
            )
            .min(1)
            .max(3)
            .describe("Up to 3 serious proposals for the next iteration"),
        },
        async execute(args) {
          const loop = loopStore.get(args.loopId);

          if (!loop) {
            throw new Error("Unknown loopId");
          }

          if (loop.status !== "running") {
            return {
              decision: "stop",
              reason: loop.stopReason ?? "Loop is already stopped",
              loop,
            };
          }

          if (loop.iterationCount >= loop.maxIterations) {
            loop.status = "stopped";
            loop.stopReason = "Reached max iterations";
            return {
              decision: "stop",
              reason: loop.stopReason,
              loop,
            };
          }

          const evaluated = args.proposals.map((raw) => {
            const proposal = normalizeProposal(raw);
            const lowValue = isLowValueProposal(proposal);
            const repeated = proposalLooksRepeated(loop, proposal);
            const score = lowValue || repeated ? 0 : scoreProposal(proposal);

            return {
              proposal,
              score,
              rejectedReasons: [
                ...(lowValue ? ["low_value"] : []),
                ...(repeated ? ["repeated"] : []),
                ...(score < loop.scoreThreshold ? ["below_threshold"] : []),
              ],
            };
          });

          evaluated.sort((a, b) => b.score - a.score);

          const best = evaluated[0];

          if (!best || best.score < loop.scoreThreshold) {
            loop.lowScoreStreak += 1;

            if (loop.lowScoreStreak >= loop.noValueStreakLimit) {
              loop.status = "stopped";
              loop.stopReason =
                "No sufficiently valuable proposals remained for consecutive iterations";
            }

            return {
              decision: "stop",
              reason:
                loop.stopReason ??
                "No proposal met the threshold for value, confidence, and testability",
              scores: evaluated,
              loop: {
                id: loop.id,
                iterationCount: loop.iterationCount,
                lowScoreStreak: loop.lowScoreStreak,
                status: loop.status,
                stopReason: loop.stopReason,
              },
            };
          }

          loop.lowScoreStreak = 0;

          return {
            decision: "continue",
            selectedProposal: best.proposal,
            selectedScore: best.score,
            scores: evaluated,
            instructions: [
              "Implement only the selected proposal.",
              "Keep the change as small and high-signal as possible.",
              "Run verification before calling record_improvement_result.",
            ],
            loop: {
              id: loop.id,
              iterationCount: loop.iterationCount,
              maxIterations: loop.maxIterations,
              status: loop.status,
            },
          };
        },
      }),

      record_improvement_result: tool({
        description:
          "Record the result of the implemented proposal and decide whether the loop should continue.",
        args: {
          loopId: tool.schema
            .string()
            .describe("The loop ID returned by start_improvement_loop"),
          selectedProposal: tool.schema.object({
            title: tool.schema.string().min(1),
            summary: tool.schema.string().min(1),
            impact: tool.schema.number().min(0).max(1),
            confidence: tool.schema.number().min(0).max(1),
            risk: tool.schema.number().min(0).max(1),
            testability: tool.schema.number().min(0).max(1),
            category: tool.schema.enum([
              "correctness",
              "maintainability",
              "performance",
              "security",
              "other",
            ]),
          }),
          selectedScore: tool.schema.number().min(0).max(1),
          status: tool.schema.enum(["success", "failed"]),
          summary: tool.schema
            .string()
            .min(1)
            .describe("What changed and whether the attempt was useful"),
          changedFiles: tool.schema
            .array(tool.schema.string())
            .default([])
            .describe("Files changed during this iteration"),
          verification: tool.schema.object({
            lint: tool.schema.enum(["pass", "fail", "not_run"]),
            tsc: tool.schema.enum(["pass", "fail", "not_run"]),
            tests: tool.schema.enum(["pass", "fail", "not_run"]),
          }),
        },
        async execute(args) {
          const loop = loopStore.get(args.loopId);

          if (!loop) {
            throw new Error("Unknown loopId");
          }

          if (loop.status !== "running") {
            return {
              decision: "stop",
              reason: loop.stopReason ?? "Loop is already stopped",
            };
          }

          loop.iterationCount += 1;

          const record: IterationRecord = {
            iteration: loop.iterationCount,
            selectedProposal: normalizeProposal(args.selectedProposal),
            selectedScore: clamp01(args.selectedScore),
            outcome: {
              status: args.status,
              verification: args.verification,
              changedFiles: args.changedFiles,
              summary: args.summary,
            },
          };

          loop.history.push(record);

          const verificationFailed =
            args.verification.lint === "fail" ||
            args.verification.tsc === "fail" ||
            args.verification.tests === "fail";

          if (verificationFailed || args.status === "failed") {
            loop.lowScoreStreak += 1;
          }

          if (loop.iterationCount >= loop.maxIterations) {
            loop.status = "stopped";
            loop.stopReason = "Reached max iterations";
          } else if (loop.lowScoreStreak >= loop.noValueStreakLimit) {
            loop.status = "stopped";
            loop.stopReason = "Too many failed or low-value iterations";
          }

          return {
            decision: loop.status === "running" ? "continue" : "stop",
            reason:
              loop.status === "running"
                ? "You may propose the next batch of improvements"
                : loop.stopReason,
            nextStep:
              loop.status === "running"
                ? "Generate up to 3 new non-redundant proposals, then call evaluate_improvement_proposals."
                : "Stop the autonomous loop and summarize the useful changes made.",
            loop: {
              id: loop.id,
              status: loop.status,
              iterationCount: loop.iterationCount,
              maxIterations: loop.maxIterations,
              lowScoreStreak: loop.lowScoreStreak,
              stopReason: loop.stopReason,
            },
            history: loop.history.map((item) => ({
              iteration: item.iteration,
              title: item.selectedProposal.title,
              score: item.selectedScore,
              status: item.outcome.status,
              verification: item.outcome.verification,
            })),
          };
        },
      }),

      get_improvement_loop_status: tool({
        description:
          "Read the current status and history of an improvement loop.",
        args: {
          loopId: tool.schema
            .string()
            .describe("The loop ID returned by start_improvement_loop"),
        },
        async execute(args) {
          const loop = loopStore.get(args.loopId);

          if (!loop) {
            throw new Error("Unknown loopId");
          }

          return {
            id: loop.id,
            cwd: loop.cwd,
            status: loop.status,
            iterationCount: loop.iterationCount,
            maxIterations: loop.maxIterations,
            scoreThreshold: loop.scoreThreshold,
            noValueStreakLimit: loop.noValueStreakLimit,
            lowScoreStreak: loop.lowScoreStreak,
            stopReason: loop.stopReason,
            history: loop.history,
          };
        },
      }),

      stop_improvement_loop: tool({
        description: "Stop a running improvement loop explicitly.",
        args: {
          loopId: tool.schema
            .string()
            .describe("The loop ID returned by start_improvement_loop"),
          reason: tool.schema.string().default("Stopped explicitly"),
        },
        async execute(args) {
          const loop = loopStore.get(args.loopId);

          if (!loop) {
            throw new Error("Unknown loopId");
          }

          loop.status = "stopped";
          loop.stopReason = args.reason;

          return {
            status: loop.status,
            stopReason: loop.stopReason,
          };
        },
      }),
    },
  };
};
