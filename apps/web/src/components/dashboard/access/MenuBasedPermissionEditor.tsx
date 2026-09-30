"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  AccessPermissionTree,
  type UserExceptionTreeState,
} from "@/components/dashboard/access/AccessPermissionTree";
import { getMenuAccessTree } from "@/lib/dashboard-menu.config";
import {
  buildModuleSlugSet,
  storageSlugFromTreeLeaf,
} from "@/lib/access-menu-permission.util";

type Props =
  | {
      variant: "function";
      selectedSlugs: string[];
      onChange: (slugs: string[]) => void;
      readOnly?: boolean;
    }
  | {
      variant: "user";
      inheritedSlugs: string[];
      allow: Set<string>;
      deny: Set<string>;
      onToggleAllow: (storageSlug: string, on: boolean) => void;
      onToggleDeny: (storageSlug: string, on: boolean) => void;
      readOnly?: boolean;
    };

export function MenuBasedPermissionEditor(props: Props) {
  const [search, setSearch] = useState("");
  const tree = useMemo(() => getMenuAccessTree(), []);

  if (props.variant === "function") {
    const selectedSet = useMemo(
      () => buildModuleSlugSet(props.selectedSlugs),
      [props.selectedSlugs],
    );

    const isEnabled = (accessSlug: string, moduleSlug?: string) => {
      const storage = storageSlugFromTreeLeaf(accessSlug, moduleSlug);
      return selectedSet.has(storage);
    };

    const onToggle = (
      accessSlug: string,
      value: boolean,
      opts?: { moduleSlug?: string },
    ) => {
      if (props.readOnly) return;
      const storage = storageSlugFromTreeLeaf(accessSlug, opts?.moduleSlug);
      const next = new Set(props.selectedSlugs);
      if (value) next.add(storage);
      else next.delete(storage);
      props.onChange(Array.from(next));
    };

    return (
      <div className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no menu…"
          className="max-w-md"
        />
        <AccessPermissionTree
          tree={tree}
          isEnabled={isEnabled}
          onToggleAccess={onToggle}
          search={search}
          readOnly={props.readOnly}
          expandWithAccess
          showTechnicalHints={false}
        />
      </div>
    );
  }

  const inheritedSet = useMemo(
    () => buildModuleSlugSet(props.inheritedSlugs),
    [props.inheritedSlugs],
  );

  const userExceptions: UserExceptionTreeState = useMemo(
    () => ({
      inherited: inheritedSet,
      allow: props.allow,
      deny: props.deny,
      onToggleAllow: props.onToggleAllow,
      onToggleDeny: props.onToggleDeny,
    }),
    [inheritedSet, props.allow, props.deny, props.onToggleAllow, props.onToggleDeny],
  );

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar no menu…"
        className="max-w-md"
      />
      <AccessPermissionTree
        tree={tree}
        isEnabled={() => false}
        onToggleAccess={() => {}}
        search={search}
        readOnly={props.readOnly}
        expandWithAccess
        showTechnicalHints={false}
        userExceptions={userExceptions}
      />
    </div>
  );
}
