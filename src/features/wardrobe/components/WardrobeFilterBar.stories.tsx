import { DressCategory } from "@prisma/client";
import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { WardrobeFilterBar } from "./WardrobeFilterBar";

const meta = {
  title: "Wardrobe/Catalog/WardrobeFilterBar",
  component: WardrobeFilterBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WardrobeFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Common no-op handlers — every story passes the same callback set, only
// the displayed state varies via args.
const noopHandlers = {
  onCategoriesChange: () => {},
  onColorsChange: () => {},
  onSizeLabelsChange: () => {},
  onThemeQueryChange: () => {},
  onLengthCmChange: () => {},
  onPriceCentsChange: () => {},
  onAvailabilityChange: () => {},
  onFitsMeChange: () => {},
  onSortChange: () => {},
  onClearAll: () => {},
};

const emptyState = {
  categories: [] as DressCategory[],
  colors: [] as string[],
  sizeLabels: [] as string[],
  themeQuery: "",
  lengthCmMin: null,
  lengthCmMax: null,
  priceMinCents: null,
  priceMaxCents: null,
  availableFrom: null,
  availableTo: null,
  fitsMe: false,
  sort: "newest" as const,
};

const facetsHandler = http.get("*/api/trpc/wardrobe.facets*", () =>
  HttpResponse.json([
    {
      result: {
        data: {
          json: {
            colors: ["Navy", "Emerald", "Crimson", "Black", "Lavender", "Ruby"],
            sizeLabels: ["XS", "S", "M", "L", "XL"],
          },
        },
      },
    },
  ]),
);

export const Default: Story = {
  args: {
    ...emptyState,
    callerHasMeasurements: true,
    ...noopHandlers,
  },
  parameters: {
    msw: { handlers: [facetsHandler] },
  },
};

export const MeasurementsSet: Story = {
  args: {
    ...emptyState,
    categories: [DressCategory.CLASSICAL, DressCategory.DRAMATIC],
    colors: ["Navy"],
    fitsMe: true,
    callerHasMeasurements: true,
    ...noopHandlers,
  },
  parameters: {
    msw: { handlers: [facetsHandler] },
  },
};

export const MeasurementsMissing: Story = {
  args: {
    ...emptyState,
    callerHasMeasurements: false,
    ...noopHandlers,
  },
  parameters: {
    msw: { handlers: [facetsHandler] },
  },
};

export const Loading: Story = {
  args: {
    ...emptyState,
    callerHasMeasurements: true,
    ...noopHandlers,
  },
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.facets*", async () => {
          await new Promise(() => {});
        }),
      ],
    },
  },
};
