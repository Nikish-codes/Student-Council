"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | Date;
  renderCell?: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  width?: string;
};

export type FilterTab<T> = {
  label: string;
  match: (row: T) => boolean;
};

export function DataTable<T>({
  rows,
  columns,
  searchPlaceholder = "Search…",
  filterTabs,
  pageSize = 25,
  emptyState,
}: {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  filterTabs?: FilterTab<T>[];
  pageSize?: number;
  emptyState?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeFilter, setActiveFilter] = useState(0);
  const [page, setPage] = useState(0);

  // Reset to page 0 when search/filter changes
  useEffect(() => {
    setPage(0);
  }, [search, activeFilter]);

  // Get searchable text for a row — search across all values
  const getSearchText = (row: T): string => {
    return Object.values(row as Record<string, unknown>)
      .map((v) => {
        if (v == null) return "";
        if (typeof v === "object") {
          try {
            return JSON.stringify(v);
          } catch {
            return "";
          }
        }
        return String(v);
      })
      .join(" ")
      .toLowerCase();
  };

  // Filter
  const filtered = useMemo(() => {
    let result = rows;

    if (filterTabs && activeFilter > 0) {
      const tab = filterTabs[activeFilter];
      if (tab) result = result.filter(tab.match);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => getSearchText(row).includes(q));
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, activeFilter, filterTabs, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;

    return [...filtered].sort((a, b) => {
      const av = col.sortValue
        ? col.sortValue(a)
        : (a as Record<string, unknown>)[sortKey];
      const bv = col.sortValue
        ? col.sortValue(b)
        : (b as Record<string, unknown>)[sortKey];

      let cmp = 0;
      if (av == null && bv == null) cmp = 0;
      else if (av == null) cmp = -1;
      else if (bv == null) cmp = 1;
      else if (av instanceof Date && bv instanceof Date)
        cmp = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const hasHeader = columns.some((c) => c.label);

  return (
    <div className="flex flex-col gap-3">
      {/* Search + filter tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {filterTabs ? (
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={activeFilter === 0}
              onClick={() => setActiveFilter(0)}
              label="All"
              count={rows.length}
            />
            {filterTabs.map((tab, i) => {
              const count = rows.filter(tab.match).length;
              return (
                <FilterPill
                  key={tab.label}
                  active={activeFilter === i + 1}
                  onClick={() => setActiveFilter(i + 1)}
                  label={tab.label}
                  count={count}
                />
              );
            })}
          </div>
        ) : null}
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-line/15 bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-line/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          {hasHeader ? (
            <thead className="bg-line/[0.03] text-left text-[10px] uppercase tracking-wider text-subtle">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-2.5 font-medium ${alignCls(c.align)} ${c.sortable ? "cursor-pointer select-none" : ""} ${c.width ?? ""}`}
                    onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable ? (
                        sortKey === c.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-line/10 last:border-0 transition-colors hover:bg-line/[0.02]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 ${alignCls(c.align)} ${c.className ?? ""}`}
                  >
                    {c.renderCell
                      ? c.renderCell(row)
                      : String(
                          (row as Record<string, unknown>)[c.key] ?? "",
                        )}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-subtle"
                >
                  {emptyState ?? "No results."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > pageSize ? (
        <div className="flex items-center justify-between text-sm text-subtle">
          <p>
            {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg p-1.5 transition-colors hover:bg-line/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-7 min-w-7 rounded-lg px-2 text-xs transition-colors ${
                  i === currentPage
                    ? "bg-ink text-bg font-medium"
                    : "hover:bg-line/5"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg p-1.5 transition-colors hover:bg-line/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-ink text-bg font-medium"
          : "border border-line/15 text-muted hover:border-line/30 hover:text-ink"
      }`}
    >
      {label}
      {count != null ? (
        <span className={active ? "opacity-60" : "opacity-40"}>{count}</span>
      ) : null}
    </button>
  );
}
