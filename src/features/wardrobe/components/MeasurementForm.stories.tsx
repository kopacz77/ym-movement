import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { MeasurementForm } from "./MeasurementForm";

const meta = {
  title: "Wardrobe/MeasurementForm",
  component: MeasurementForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MeasurementForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// MeasurementForm self-fetches via api.wardrobe.measurements.get.useQuery()
// (returns shape from measurementQueries.get — Plan 14-04). Each story varies
// only the response payload so we exercise the four UI states: empty profile,
// prefilled values, loading skeleton, and NOT_FOUND fallback.

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.measurements.get*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: {
                    heightCm: null,
                    chestCm: null,
                    waistCm: null,
                    hipsCm: null,
                    torsoCm: null,
                    inseamCm: null,
                    sleeveLengthCm: null,
                    preferredFitNotes: null,
                    measurementsUpdatedAt: null,
                  },
                  meta: { values: { measurementsUpdatedAt: ["undefined"] } },
                },
              },
            },
          ]),
        ),
      ],
    },
  },
};

export const Prefilled: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.measurements.get*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: {
                    heightCm: 160,
                    chestCm: 86,
                    waistCm: 66,
                    hipsCm: 92,
                    torsoCm: 42,
                    inseamCm: 76,
                    sleeveLengthCm: 58,
                    preferredFitNotes: "Snug at waist, room at hips.",
                    measurementsUpdatedAt: "2026-04-15T12:00:00.000Z",
                  },
                  meta: { values: { measurementsUpdatedAt: ["Date"] } },
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
        http.get("*/api/trpc/wardrobe.measurements.get*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};

export const NotFound: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.measurements.get*", () =>
          HttpResponse.json(
            [
              {
                error: {
                  json: {
                    message: "Student profile not found",
                    code: -32004,
                    data: { code: "NOT_FOUND", httpStatus: 404 },
                  },
                },
              },
            ],
            { status: 404 },
          ),
        ),
      ],
    },
  },
};
