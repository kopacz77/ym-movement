import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { RequestRentalDialog } from "./RequestRentalDialog";

const meta = {
  title: "Wardrobe/Request/RequestRentalDialog",
  component: RequestRentalDialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RequestRentalDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseDress = {
  id: "story-dress-1",
  title: "Midnight Crystal Classical",
  purchasePrice: 50000,
};

const availabilityOk = http.get("*/api/trpc/wardrobe.requests.checkAvailability*", () =>
  HttpResponse.json([
    {
      result: {
        data: {
          json: {
            available: true,
            reason: null,
            conflictStart: null,
            conflictEnd: null,
          },
        },
      },
    },
  ]),
);

const availabilityConflict = http.get("*/api/trpc/wardrobe.requests.checkAvailability*", () =>
  HttpResponse.json([
    {
      result: {
        data: {
          json: {
            available: false,
            reason: "Already booked",
            conflictStart: "2026-06-10T00:00:00.000Z",
            conflictEnd: "2026-06-15T00:00:00.000Z",
          },
          meta: { values: { conflictStart: ["Date"], conflictEnd: ["Date"] } },
        },
      },
    },
  ]),
);

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    dress: baseDress,
  },
  parameters: {
    msw: { handlers: [availabilityOk] },
  },
};

export const ConflictWarning: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    dress: baseDress,
  },
  parameters: {
    msw: { handlers: [availabilityConflict] },
  },
};

export const NoPurchaseOption: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    dress: { ...baseDress, purchasePrice: null },
  },
  parameters: {
    msw: { handlers: [availabilityOk] },
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    dress: baseDress,
  },
  parameters: {
    msw: { handlers: [availabilityOk] },
  },
};
