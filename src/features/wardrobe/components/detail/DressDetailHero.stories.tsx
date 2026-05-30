import type { Meta, StoryObj } from "@storybook/react";
import { DressDetailHero } from "./DressDetailHero";

const meta = {
  title: "Wardrobe/Detail/DressDetailHero",
  component: DressDetailHero,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DressDetailHero>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseDress = {
  id: "story-dress-detail-1",
  title: "Midnight Crystal Classical",
  category: "CLASSICAL" as const,
  status: "AVAILABLE" as const,
  color: "Navy",
  sizeLabel: "S",
  Images: [
    {
      id: "img-1",
      url: "https://picsum.photos/seed/detail-1/800/1000",
      isPrimary: true,
      sortOrder: 0,
    },
  ],
};

const multipleImages = [
  {
    id: "img-1",
    url: "https://picsum.photos/seed/detail-1/800/1000",
    isPrimary: true,
    sortOrder: 0,
  },
  {
    id: "img-2",
    url: "https://picsum.photos/seed/detail-2/800/1000",
    isPrimary: false,
    sortOrder: 1,
  },
  {
    id: "img-3",
    url: "https://picsum.photos/seed/detail-3/800/1000",
    isPrimary: false,
    sortOrder: 2,
  },
  {
    id: "img-4",
    url: "https://picsum.photos/seed/detail-4/800/1000",
    isPrimary: false,
    sortOrder: 3,
  },
  {
    id: "img-5",
    url: "https://picsum.photos/seed/detail-5/800/1000",
    isPrimary: false,
    sortOrder: 4,
  },
];

export const Default: Story = {
  args: {
    dress: baseDress,
    fitScorePercent: null,
    onRequestClick: () => {},
    isAuthenticated: true,
  },
};

export const WithAllImages: Story = {
  args: {
    dress: { ...baseDress, Images: multipleImages },
    fitScorePercent: 88,
    onRequestClick: () => {},
    isAuthenticated: true,
  },
};

export const Unauthenticated: Story = {
  args: {
    dress: baseDress,
    fitScorePercent: null,
    onRequestClick: () => {},
    isAuthenticated: false,
  },
};

export const RentedStatus: Story = {
  args: {
    dress: { ...baseDress, status: "RENTED" as const },
    fitScorePercent: 92,
    onRequestClick: () => {},
    isAuthenticated: true,
  },
};
