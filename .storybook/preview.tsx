import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import { initialize, mswLoader } from "msw-storybook-addon";

import "../src/styles/globals.css";
import { TRPCDecorator } from "./decorators/TRPCDecorator";

// Initialize MSW — must be called before any story renders
initialize({
  onUnhandledRequest: "bypass",
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
  loaders: [mswLoader],
  decorators: [
    // TRPC + QueryClient provider — enables api.*.useQuery() in stories
    (Story) => (
      <TRPCDecorator>
        <Story />
      </TRPCDecorator>
    ),
    // Dark mode toggle — matches Tailwind's darkMode: "class" config
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    // Font variables decorator — next/font doesn't run in Storybook
    (Story) => (
      <div style={{ fontFamily: "'Public Sans', 'Inter', system-ui, sans-serif" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
