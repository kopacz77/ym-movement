import type { Meta, StoryObj } from "@storybook/react";
import { DressCard } from "./DressCard";

const meta = {
  title: "Wardrobe/Catalog/DressCard",
  component: DressCard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DressCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseDress = {
  id: "story-dress-1",
  title: "Midnight Crystal Classical",
  category: "CLASSICAL" as const,
  status: "AVAILABLE" as const,
  sizeLabel: "S",
  competitionPrice: 5000,
  color: "Navy",
  Images: [
    { url: "https://picsum.photos/seed/story-dress-1/600/800", isPrimary: true, sortOrder: 0 },
  ],
};

export const Default: Story = {
  args: { dress: baseDress },
};

export const WithBestFitScore: Story = {
  args: {
    dress: baseDress,
    fitScorePercent: 92,
  },
};

export const NoImage: Story = {
  args: {
    dress: { ...baseDress, Images: [] },
  },
};

export const PendingStatus: Story = {
  args: {
    dress: { ...baseDress, status: "PENDING" as const },
  },
};
