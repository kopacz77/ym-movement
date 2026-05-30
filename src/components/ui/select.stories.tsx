import type { Meta, StoryObj } from "@storybook/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

// Tier-1 UI primitive. Radix wrapper — no TRPC, no MSW.
// Stories render the trigger only (closed state) because Radix uses a portal
// for SelectContent which is harder to screenshot reliably. The closed trigger
// + value text is the canonical visual for VRT.

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Pick a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="classical">Classical</SelectItem>
        <SelectItem value="dramatic">Dramatic</SelectItem>
        <SelectItem value="themed">Themed</SelectItem>
        <SelectItem value="ice-dance-single">Ice Dance (Solo)</SelectItem>
        <SelectItem value="ice-dance-partner">Ice Dance (Partner)</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithSelection: Story = {
  render: () => (
    <Select defaultValue="classical">
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="classical">Classical</SelectItem>
        <SelectItem value="dramatic">Dramatic</SelectItem>
        <SelectItem value="themed">Themed</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled defaultValue="classical">
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="classical">Classical</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithManyOptions: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Pick a color" />
      </SelectTrigger>
      <SelectContent>
        {[
          "Navy",
          "Emerald",
          "Crimson",
          "Black",
          "White",
          "Lavender",
          "Ruby",
          "Sapphire",
          "Gold",
          "Silver",
          "Rose",
          "Teal",
          "Amber",
          "Plum",
          "Ivory",
          "Charcoal",
          "Coral",
          "Mint",
          "Mustard",
          "Peach",
        ].map((color) => (
          <SelectItem key={color} value={color.toLowerCase()}>
            {color}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};
