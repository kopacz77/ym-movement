"use client";

import { CalendarIcon, FileTextIcon, MagnifyingGlassIcon, PersonIcon } from "@radix-ui/react-icons";
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

export function StudentCommandPalette() {
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
          <CommandItem onSelect={() => runCommand(() => router.push("/student/dashboard"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/student/book"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Book Lessons
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/student/schedule"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            My Schedule
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/student/payments"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Payments
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/student/profile"))}>
            <PersonIcon className="mr-2 h-4 w-4" />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/student/settings"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/student/book"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Book a Lesson
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
