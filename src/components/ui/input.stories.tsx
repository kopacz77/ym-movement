import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Enter text..." },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="student@example.com" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: "Disabled input", disabled: true },
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email-err">Email</Label>
      <Input
        type="email"
        id="email-err"
        placeholder="Email"
        aria-invalid="true"
        className="border-destructive"
      />
      <p className="text-sm text-destructive">Please enter a valid email address</p>
    </div>
  ),
};
