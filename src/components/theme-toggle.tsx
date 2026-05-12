"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- defer render until client mount for theme
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className="inline-block h-9 w-[7.5rem] rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900" />
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="hidden sm:inline">Theme</span>
      <select
        value={theme ?? "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
