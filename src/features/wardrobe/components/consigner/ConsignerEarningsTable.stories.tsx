import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { ConsignerEarningsTable } from "./ConsignerEarningsTable";

const meta = {
  title: "Wardrobe/Consigner/ConsignerEarningsTable",
  component: ConsignerEarningsTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConsignerEarningsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Self-fetches via api.wardrobe.consigner.myEarnings (Plan 19-01).
// Shape: { rentalsByDress: [{ dress, rentals: [...] }], totals: {...} }

const sampleDress1 = {
  id: "dress-1",
  title: "Midnight Crystal Classical",
  sizeLabel: "S",
  color: "Navy",
  status: "AVAILABLE",
  Images: [{ url: "https://picsum.photos/seed/earn-1/200/200" }],
};

const sampleDress2 = {
  id: "dress-2",
  title: "Emerald Waltz Classical",
  sizeLabel: "M",
  color: "Emerald",
  status: "RENTED",
  Images: [{ url: "https://picsum.photos/seed/earn-2/200/200" }],
};

const makeRental = (
  id: string,
  renterName: string,
  startDate: string,
  endDate: string,
  rentalFee: number,
  payout: number,
  paid: boolean,
  paidAt: string | null,
) => ({
  id,
  startDate,
  endDate,
  rentalType: "COMPETITION",
  rentalFee,
  consignmentPayoutAmount: payout,
  consignmentPaidOut: paid,
  consignmentPaidOutAt: paidAt,
  paymentStatus: "PAID",
  Student: { User: { name: renterName } },
});

const defaultData = {
  rentalsByDress: [
    {
      dress: sampleDress1,
      rentals: [
        makeRental(
          "r1",
          "Avery Johnson",
          "2026-03-05T00:00:00.000Z",
          "2026-03-08T00:00:00.000Z",
          5000,
          4250,
          true,
          "2026-03-20T00:00:00.000Z",
        ),
        makeRental(
          "r2",
          "Mira Chen",
          "2026-04-12T00:00:00.000Z",
          "2026-04-15T00:00:00.000Z",
          5000,
          4250,
          false,
          null,
        ),
      ],
    },
    {
      dress: sampleDress2,
      rentals: [
        makeRental(
          "r3",
          "Sasha Petrov",
          "2026-02-01T00:00:00.000Z",
          "2026-02-05T00:00:00.000Z",
          6000,
          5100,
          true,
          "2026-02-20T00:00:00.000Z",
        ),
        makeRental(
          "r4",
          "Lin Park",
          "2026-03-15T00:00:00.000Z",
          "2026-03-18T00:00:00.000Z",
          6000,
          5100,
          false,
          null,
        ),
        makeRental(
          "r5",
          "Jamie Wright",
          "2026-04-22T00:00:00.000Z",
          "2026-04-26T00:00:00.000Z",
          6000,
          5100,
          false,
          null,
        ),
      ],
    },
  ],
  totals: { earnedToDate: 9350, pendingPayout: 14450, rentalCount: 5 },
};

const allPaidData = {
  rentalsByDress: [
    {
      dress: sampleDress1,
      rentals: [
        makeRental(
          "r1",
          "Avery Johnson",
          "2026-03-05T00:00:00.000Z",
          "2026-03-08T00:00:00.000Z",
          5000,
          4250,
          true,
          "2026-03-20T00:00:00.000Z",
        ),
        makeRental(
          "r2",
          "Mira Chen",
          "2026-04-12T00:00:00.000Z",
          "2026-04-15T00:00:00.000Z",
          5000,
          4250,
          true,
          "2026-04-25T00:00:00.000Z",
        ),
      ],
    },
  ],
  totals: { earnedToDate: 8500, pendingPayout: 0, rentalCount: 2 },
};

const buildDateMeta = (data: typeof defaultData) => {
  const values: Record<string, string[]> = {};
  data.rentalsByDress.forEach((group, gi) => {
    group.rentals.forEach((r, ri) => {
      values[`rentalsByDress.${gi}.rentals.${ri}.startDate`] = ["Date"];
      values[`rentalsByDress.${gi}.rentals.${ri}.endDate`] = ["Date"];
      if (r.consignmentPaidOutAt) {
        values[`rentalsByDress.${gi}.rentals.${ri}.consignmentPaidOutAt`] = ["Date"];
      }
    });
  });
  return { values };
};

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.consigner.myEarnings*", () =>
          HttpResponse.json([
            {
              result: {
                data: { json: defaultData, meta: buildDateMeta(defaultData) },
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
        http.get("*/api/trpc/wardrobe.consigner.myEarnings*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: {
                    rentalsByDress: [],
                    totals: { earnedToDate: 0, pendingPayout: 0, rentalCount: 0 },
                  },
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const AllPaid: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.consigner.myEarnings*", () =>
          HttpResponse.json([
            {
              result: {
                data: { json: allPaidData, meta: buildDateMeta(allPaidData) },
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
        http.get("*/api/trpc/wardrobe.consigner.myEarnings*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
