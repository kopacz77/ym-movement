import type { Meta, StoryObj } from "@storybook/react";
import { FitCheckCard } from "./FitCheckCard";

const meta = {
  title: "Wardrobe/Detail/FitCheckCard",
  component: FitCheckCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FitCheckCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseDress = {
  chestMinCm: 84,
  chestMaxCm: 90,
  waistMinCm: 64,
  waistMaxCm: 70,
  hipsMinCm: 90,
  hipsMaxCm: 96,
  alterableSmaller: false,
  alterableLarger: false,
};

export const AllGreen: Story = {
  args: {
    dress: baseDress,
    measurements: { chestCm: 87, waistCm: 67, hipsCm: 93 },
  },
};

export const MixedAmber: Story = {
  args: {
    dress: { ...baseDress, alterableSmaller: true, alterableLarger: true },
    measurements: { chestCm: 91, waistCm: 67, hipsCm: 97 },
  },
};

export const AllRed: Story = {
  args: {
    dress: baseDress,
    measurements: { chestCm: 100, waistCm: 80, hipsCm: 110 },
  },
};

export const MissingMeasurements: Story = {
  args: {
    dress: baseDress,
    measurements: null,
  },
};

export const PartialMeasurements: Story = {
  args: {
    dress: baseDress,
    measurements: { chestCm: 87, waistCm: null, hipsCm: null },
  },
};
