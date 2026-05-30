import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { EarningsOverview } from "./EarningsOverview";

// Tier-3 coach earnings widget. Self-fetches via api.coach.earnings.getEarningsSummary.
// No SessionProvider needed — procedure response is keyed by ctx.session.user.id
// on the server, but the component doesn't read the session client-side, so the
// MSW mock alone is enough.

const meta = {
  title: "Coach/Earnings/EarningsOverview",
  component: EarningsOverview,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EarningsOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.earnings.getEarningsSummary*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  totalEarnings: 18420.5,
                  monthEarnings: 2540.0,
                  pendingAmount: 380.0,
                  pendingCount: 3,
                  revenueSplitPercent: 70,
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const NewCoach: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.earnings.getEarningsSummary*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  totalEarnings: 0,
                  monthEarnings: 0,
                  pendingAmount: 0,
                  pendingCount: 0,
                  revenueSplitPercent: 70,
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const HighEarnings: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.earnings.getEarningsSummary*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  totalEarnings: 60240.0,
                  monthEarnings: 8120.5,
                  pendingAmount: 1450.0,
                  pendingCount: 9,
                  revenueSplitPercent: 80,
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/coach.earnings.getEarningsSummary*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
