"use client";

import { CalendarIcon, FileTextIcon, PersonIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CoachCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/dashboard"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/schedule"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Schedule
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/students"))}>
            <PersonIcon className="mr-2 h-4 w-4" />
            Students
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/earnings"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Earnings
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/proposals"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Proposals
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/profile"))}>
            <PersonIcon className="mr-2 h-4 w-4" />
            Profile
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/coach/schedule"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            View My Schedule
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
