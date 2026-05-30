import type { Meta, StoryObj } from "@storybook/react";
import { DressImageCarousel } from "./DressImageCarousel";

// Tier-2 wardrobe widget. Pure prop-driven — no TRPC, no MSW.
// Picsum seeds match the catalog seed pattern (scripts/seed-wardrobe.ts) so
// the screenshot stays byte-stable across VRT runs.

const meta = {
  title: "Wardrobe/Detail/DressImageCarousel",
  component: DressImageCarousel,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[480px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DressImageCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleImage: Story = {
  args: {
    title: "Midnight Crystal Classical",
    images: [
      {
        id: "img-1",
        url: "https://picsum.photos/seed/dress-carousel-single/600/800",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
};

export const MultipleImages: Story = {
  args: {
    title: "Emerald Waltz Classical",
    images: [
      {
        id: "img-1",
        url: "https://picsum.photos/seed/dress-carousel-multi-1/600/800",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        id: "img-2",
        url: "https://picsum.photos/seed/dress-carousel-multi-2/600/800",
        isPrimary: false,
        sortOrder: 1,
      },
      {
        id: "img-3",
        url: "https://picsum.photos/seed/dress-carousel-multi-3/600/800",
        isPrimary: false,
        sortOrder: 2,
      },
      {
        id: "img-4",
        url: "https://picsum.photos/seed/dress-carousel-multi-4/600/800",
        isPrimary: false,
        sortOrder: 3,
      },
      {
        id: "img-5",
        url: "https://picsum.photos/seed/dress-carousel-multi-5/600/800",
        isPrimary: false,
        sortOrder: 4,
      },
    ],
  },
};

export const EmptyState: Story = {
  args: {
    title: "Unphotographed Dress",
    images: [],
  },
};
