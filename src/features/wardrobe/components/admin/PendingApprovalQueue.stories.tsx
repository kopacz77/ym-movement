import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { PendingApprovalQueue } from "./PendingApprovalQueue";

const meta = {
  title: "Wardrobe/Admin/PendingApprovalQueue",
  component: PendingApprovalQueue,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PendingApprovalQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

// Self-fetches via admin.wardrobe.listPendingApproval (Plan 18-02).
// Shape mirrors PendingApprovalQueue's local QueueRow type.

type Row = {
  id: string;
  title: string;
  category: string;
  consignmentCommissionPct: number;
  createdAt: string;
  Owner: { id: string; name: string | null; email: string };
  Images: { url: string }[];
  _count: { Images: number };
};

const makeRow = (i: number, category: string, hoursAgo: number): Row => ({
  id: `pending-${i}`,
  title: `Submission #${i} — ${category} dress`,
  category,
  consignmentCommissionPct: 15 + (i % 3) * 5,
  createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
  Owner: {
    id: `consigner-${i}`,
    name: `Consigner ${i}`,
    email: `consigner${i}@example.com`,
  },
  Images: [{ url: `https://picsum.photos/seed/pending-${i}/200/200` }],
  _count: { Images: 1 + (i % 4) },
});

const threeRows = [
  makeRow(1, "CLASSICAL", 72),
  makeRow(2, "DRAMATIC", 36),
  makeRow(3, "THEMED", 12),
];

const fifteenRows = Array.from({ length: 15 }, (_, i) =>
  makeRow(
    i + 1,
    ["CLASSICAL", "DRAMATIC", "THEMED", "ICE_DANCE_PARTNER", "ICE_DANCE_SINGLE"][i % 5],
    240 - i * 12,
  ),
);

const dateMeta = (rows: Row[]) => ({
  values: Object.fromEntries(rows.map((_, i) => [`dresses.${i}.createdAt`, ["Date"]])),
});

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.wardrobe.listPendingApproval*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: { dresses: threeRows, total: 3, page: 1, limit: 50 },
                  meta: dateMeta(threeRows),
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.wardrobe.listPendingApproval*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: { dresses: [], total: 0, page: 1, limit: 50 },
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const HighVolume: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.wardrobe.listPendingApproval*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: { dresses: fifteenRows, total: 15, page: 1, limit: 50 },
                  meta: dateMeta(fifteenRows),
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
        http.get("*/api/trpc/admin.wardrobe.listPendingApproval*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
