"use client";

import { useEffect, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { MODELS } from "@/lib/assistant/constants";
import { cx } from "../components/ui";

/** Model picker of the chat: a compact trigger, a menu opening above the composer. */
export function ModelSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // In <body> the menu would lose the --fi-* colours: mount it inside the section.
  useEffect(() => {
    setContainer(trigger.current?.closest<HTMLElement>(".fi") ?? null);
  }, []);

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        ref={trigger}
        aria-label="Modello"
        className="flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-[var(--fi-ink-2)] outline-none transition-colors hover:bg-[var(--fi-fill)] hover:text-[var(--fi-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fi-action)] data-[state=open]:bg-[var(--fi-fill)] data-[state=open]:text-[var(--fi-ink)]"
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown aria-hidden className="h-3.5 w-3.5 text-[var(--fi-muted)]" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal container={container}>
        <Select.Content
          position="popper"
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 w-64 overflow-hidden rounded-xl border border-[var(--fi-rule)] bg-[var(--fi-surface)] p-1 shadow-[0_12px_32px_-8px_rgba(18,22,43,0.22),0_2px_6px_rgba(18,22,43,0.06)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1"
        >
          <Select.Viewport>
            {MODELS.map((m) => (
              <Select.Item
                key={m.id}
                value={m.id}
                className={cx(
                  "relative flex cursor-pointer select-none flex-col rounded-lg py-2 pl-3 pr-8 outline-none transition-colors",
                  "data-[highlighted]:bg-[var(--fi-ground)] data-[state=checked]:bg-[var(--fi-action-soft)]",
                )}
              >
                <span className="text-[13px] font-medium text-[var(--fi-ink)]">
                  <Select.ItemText>{m.label}</Select.ItemText>
                </span>
                <span className="mt-0.5 text-xs leading-snug text-[var(--fi-muted)]">{m.hint}</span>
                <Select.ItemIndicator className="absolute right-2.5 top-2.5">
                  <Check aria-hidden className="h-4 w-4 text-[var(--fi-action)]" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
