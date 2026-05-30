import type { Meta, StoryObj } from "@storybook/react";
import { HttpResponse, http } from "msw";
import { CatalogGrid } from "./CatalogGrid";

const meta = {
  title: "Wardrobe/Catalog/CatalogGrid",
  component: CatalogGrid,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CatalogGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// CatalogGrid is the /wardrobe page's main component. Self-fetches via
// api.wardrobe.list (returns {items, total, page, limit, callerHasMeasurements})
// and api.wardrobe.facets (colors + sizeLabels for filter bar hydration).
//
// Per 21-RESEARCH §STORY-03, the Empty + Populated stories below ARE the
// /wardrobe empty + populated VRT vehicle. Six-dress populated fixture mirrors
// scripts/seed-wardrobe.ts so the screenshot stays stable.

const sampleDress = (id: string, title: string, category: string, color: string) => ({
  id,
  title,
  category,
  color,
  sizeLabel: "S",
  competitionPrice: 5000,
  status: "AVAILABLE",
  Images: [{ url: `https://picsum.photos/seed/${id}/600/800`, isPrimary: true, sortOrder: 0 }],
  fitScorePercent: null as number | null,
});

const sixDresses = [
  sampleDress("d1", "Midnight Crystal Classical", "CLASSICAL", "Navy"),
  sampleDress("d2", "Emerald Waltz Classical", "CLASSICAL", "Emerald"),
  sampleDress("d3", "Crimson Tango Dramatic", "DRAMATIC", "Crimson"),
  sampleDress("d4", "Constellation Themed", "THEMED", "Black"),
  sampleDress("d5", "Aurora Ice Dance Partner", "ICE_DANCE_PARTNER", "Lavender"),
  sampleDress("d6", "Solo Spotlight Ice Dance", "ICE_DANCE_SINGLE", "Ruby"),
];

const facetsHandler = http.get("*/api/trpc/wardrobe.facets*", () =>
  HttpResponse.json([
    {
      result: {
        data: {
          json: {
            colors: ["Navy", "Emerald", "Crimson", "Black", "Lavender", "Ruby"],
            sizeLabels: ["XS", "S", "M", "L"],
          },
        },
      },
    },
  ]),
);

const emptyFacetsHandler = http.get("*/api/trpc/wardrobe.facets*", () =>
  HttpResponse.json([{ result: { data: { json: { colors: [], sizeLabels: [] } } } }]),
);

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.list*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: {
                    items: sixDresses,
                    total: 6,
                    page: 1,
                    limit: 24,
                    callerHasMeasurements: false,
                  },
                },
              },
            },
          ]),
        ),
        facetsHandler,
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.list*", () =>
          HttpResponse.json([
            {
              result: {
                data: {
                  json: {
                    items: [],
                    total: 0,
                    page: 1,
                    limit: 24,
                    callerHasMeasurements: false,
                  },
                },
              },
            },
          ]),
        ),
        emptyFacetsHandler,
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.list*", async () => {
          await new Promise(() => {});
        }),
        facetsHandler,
      ],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/wardrobe.list*", () =>
          HttpResponse.json(
            [
              {
                error: {
                  json: {
                    message: "Internal Server Error — failed to load catalog.",
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
                  },
                },
              },
            ],
            { status: 500 },
          ),
        ),
        facetsHandler,
      ],
    },
  },
};
