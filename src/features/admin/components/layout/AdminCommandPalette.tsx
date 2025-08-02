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

export function AdminCommandPalette() {
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
          <CommandItem onSelect={() => runCommand(() => router.push("/admin/dashboard"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/admin/schedule"))}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Schedule Management
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/admin/students"))}>
            <PersonIcon className="mr-2 h-4 w-4" />
            Students
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/admin/payments"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Payments
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/admin/reports"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Reports
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/admin/settings"))}>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/schedule?action=create"))}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Create Time Slot
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/students?action=create"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            Add New Student
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
