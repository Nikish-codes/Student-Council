"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  CircleAlert,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  ScanText,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type {
  OvalDayStatus,
  OvalDiet,
  OvalMealId,
  OvalMenuItem,
} from "@/db/schema";
import { inputCls } from "@/components/management/fields";
import {
  OVAL_MEALS,
  OVAL_WEEKDAYS,
  addIsoDays,
  countOvalReviewFlags,
  formatOvalDate,
  validateApprovableMeals,
  type OvalWeekDraft,
} from "@/lib/oval-menu";
import { cn } from "@/lib/utils";
import {
  approveOvalDay,
  returnOvalDayToDraft,
  saveOvalWeek,
} from "./actions";

type StatusMap = Record<
  string,
  { status: OvalDayStatus; approvedAt: string | null } | undefined
>;

const DIETS: Array<{ id: OvalDiet; label: string; short: string }> = [
  { id: "veg", label: "Vegetarian", short: "V" },
  { id: "egg", label: "Contains egg", short: "E" },
  { id: "nonveg", label: "Non-vegetarian", short: "NV" },
];

export function OvalWeekEditor({
  initialWeek,
  statuses,
  serviceDate,
  notice,
}: {
  initialWeek: OvalWeekDraft;
  statuses: StatusMap;
  serviceDate: string;
  notice?: string;
}) {
  const [week, setWeek] = React.useState(initialWeek);
  const initialSelected = initialWeek.days.findIndex(
    (day) => day.menuDate === serviceDate,
  );
  const [selectedIndex, setSelectedIndex] = React.useState(
    initialSelected >= 0 ? initialSelected : 0,
  );
  const [sourceFile, setSourceFile] = React.useState<File | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const baseline = React.useRef(JSON.stringify(initialWeek));

  React.useEffect(() => {
    if (!sourceFile?.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  React.useEffect(() => {
    if (notice) toast.success(notice);
  }, [notice]);

  const selectedDay = week.days[selectedIndex];
  const selectedStatus = statuses[selectedDay.menuDate];
  const dirty = JSON.stringify(week) !== baseline.current;
  const reviewCount = countOvalReviewFlags(selectedDay.meals);
  const approvalErrors = validateApprovableMeals(selectedDay.meals);
  const canApprove =
    !dirty && selectedStatus?.status !== "approved" && approvalErrors.length === 0;

  function changeItems(
    meal: OvalMealId,
    update: (items: OvalMenuItem[]) => OvalMenuItem[],
  ) {
    setWeek((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) =>
        dayIndex === selectedIndex
          ? {
              ...day,
              meals: { ...day.meals, [meal]: update(day.meals[meal]) },
            }
          : day,
      ),
    }));
  }

  function updateItem(
    meal: OvalMealId,
    itemId: string,
    patch: Partial<OvalMenuItem>,
  ) {
    changeItems(meal, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }

  function addItem(meal: OvalMealId) {
    changeItems(meal, (items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        category: "",
        dish: "",
        diets: ["veg"],
        confidence: 1,
        needsReview: false,
      },
    ]);
  }

  function removeItem(meal: OvalMealId, itemId: string) {
    changeItems(meal, (items) => items.filter((item) => item.id !== itemId));
  }

  function toggleDiet(meal: OvalMealId, item: OvalMenuItem, diet: OvalDiet) {
    const exists = item.diets.includes(diet);
    const next = exists
      ? item.diets.filter((value) => value !== diet)
      : [...item.diets, diet];
    if (next.length === 0) {
      toast.error("Every dish needs at least one dietary marker");
      return;
    }
    updateItem(meal, item.id, { diets: next });
  }

  function chooseFile(file: File | null) {
    if (!file) return;
    setSourceFile(file);
  }

  async function extract() {
    if (!sourceFile) {
      toast.error("Choose the weekly menu image, PDF, or spreadsheet first");
      return;
    }
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.set("file", sourceFile);
      formData.set("weekStart", week.weekStart);
      const response = await fetch("/api/management/oval/extract", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as {
        week?: OvalWeekDraft;
        error?: string;
      };
      if (!response.ok || !body.week) {
        throw new Error(body.error || "Menu extraction failed");
      }
      setWeek(body.week);
      setSelectedIndex(0);
      toast.success("Seven days extracted. Review every flagged cell before approval.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Menu extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="kicker text-subtle">Import the whole week</p>
          <h2 className="display mt-2 text-3xl">Source to structured menu</h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
            Spreadsheets are read cell by cell. Images and PDFs receive two OCR
            passes. Extraction creates an editable draft and never publishes it.
          </p>
        </div>
        <div
          className={cn(
            "rounded-2xl border border-dashed bg-surface p-5 transition-colors",
            dragging ? "border-accent bg-accent/[0.04]" : "border-line/20",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            chooseFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
                {sourceFile?.name.match(/\.(xlsx?|csv|tsv)$/i) ? (
                  <FileSpreadsheet className="h-5 w-5" />
                ) : (
                  <FileImage className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {sourceFile?.name ?? "Drop the committee sheet here"}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  PNG, JPEG, WebP, PDF, XLS, XLSX, CSV or TSV · up to 15 MB
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line/20 px-4 text-xs font-medium text-ink hover:border-line/45">
                <Upload className="h-3.5 w-3.5" />
                Choose file
                <input
                  type="file"
                  className="sr-only"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.xls,.xlsx,.csv,.tsv"
                  onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={extract}
                disabled={!sourceFile || extracting}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-bg disabled:cursor-not-allowed disabled:opacity-45"
              >
                {extracting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ScanText className="h-3.5 w-3.5" />
                )}
                {extracting ? "Reading every cell…" : "Extract seven days"}
              </button>
            </div>
          </div>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img
              src={previewUrl}
              alt="Selected weekly menu source preview"
              className="mt-5 max-h-72 w-full rounded-xl bg-white object-contain"
            />
          ) : null}
        </div>
      </section>

      <section>
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Week days">
          {week.days.map((day, index) => {
            const status = statuses[day.menuDate]?.status ?? "draft";
            const flags = countOvalReviewFlags(day.meals);
            const isCurrent = day.menuDate === serviceDate;
            const isNext = day.menuDate === addIsoDays(serviceDate, 1);
            return (
              <button
                key={day.menuDate}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-pressed={selectedIndex === index}
                className={cn(
                  "min-w-[132px] rounded-xl border p-4 text-left transition-colors",
                  selectedIndex === index
                    ? "border-ink bg-ink text-bg"
                    : "border-line/15 bg-surface text-ink hover:border-line/35",
                )}
              >
                <span className="flex items-center justify-between gap-2 text-[11px] opacity-65">
                  {isCurrent ? "Current" : isNext ? "Next day" : OVAL_WEEKDAYS[index]}
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      status === "approved" ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                </span>
                <span className="mt-2 block text-sm font-medium">
                  {formatOvalDate(day.menuDate, { day: "numeric", month: "short" })}
                </span>
                <span className="mt-2 block text-[11px] opacity-65">
                  {flags ? `${flags} to review` : status === "approved" ? "Approved" : "Draft"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line/15 pb-5">
            <div>
              <p className="kicker text-subtle">Editing</p>
              <h2 className="display mt-1 text-3xl">
                {formatOvalDate(selectedDay.menuDate)}
              </h2>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-2 text-xs font-medium",
                selectedStatus?.status === "approved"
                  ? "text-emerald-500"
                  : "text-amber-500",
              )}
            >
              {selectedStatus?.status === "approved" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <CircleAlert className="h-4 w-4" />
              )}
              {selectedStatus?.status === "approved" ? "Approved" : "Draft"}
            </span>
          </div>

          {OVAL_MEALS.map((meal) => (
            <MealEditor
              key={meal.id}
              meal={meal.id}
              label={meal.label}
              time={meal.time}
              items={selectedDay.meals[meal.id]}
              onUpdate={(id, patch) => updateItem(meal.id, id, patch)}
              onToggleDiet={(item, diet) => toggleDiet(meal.id, item, diet)}
              onRemove={(id) => removeItem(meal.id, id)}
              onAdd={() => addItem(meal.id)}
            />
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-2xl bg-surface p-5">
            <p className="kicker text-subtle">Review status</p>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-ink">
              {reviewCount}
            </p>
            <p className="mt-1 text-sm text-muted">uncertain cells remaining</p>
            <div className="mt-5 space-y-2 border-t border-line/10 pt-4 text-xs text-subtle">
              <p>{selectedDay.meals.breakfast.length} breakfast entries</p>
              <p>{selectedDay.meals.lunch.length} lunch entries</p>
              <p>{selectedDay.meals.dinner.length} dinner entries</p>
            </div>
          </div>

          {dirty ? (
            <div className="rounded-2xl bg-amber-500/10 p-5 text-sm text-amber-500">
              Save changes before approving. Editing an approved day safely returns
              it to draft.
            </div>
          ) : null}

          <form action={saveOvalWeek}>
            <input type="hidden" name="payload" value={JSON.stringify(week)} />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg hover:opacity-85"
            >
              <Save className="h-4 w-4" /> Save whole week
            </button>
          </form>

          {selectedStatus?.status === "approved" ? (
            <form action={returnOvalDayToDraft}>
              <input type="hidden" name="menuDate" value={selectedDay.menuDate} />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line/20 px-5 text-sm font-medium text-ink hover:border-line/45"
              >
                Return day to draft
              </button>
            </form>
          ) : (
            <form action={approveOvalDay}>
              <input type="hidden" name="menuDate" value={selectedDay.menuDate} />
              <button
                type="submit"
                disabled={!canApprove}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Approve this day
              </button>
            </form>
          )}
          {!canApprove && selectedStatus?.status !== "approved" ? (
            <p className="text-xs leading-relaxed text-subtle">
              {dirty
                ? "The saved version must match what you are reviewing."
                : approvalErrors.join(" · ")}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-subtle">
            Approved days become public automatically at 4:00 AM on their service
            date. Other days remain private.
          </p>
        </aside>
      </section>
    </div>
  );
}
function MealEditor({
  meal,
  label,
  time,
  items,
  onUpdate,
  onToggleDiet,
  onRemove,
  onAdd,
}: {
  meal: OvalMealId;
  label: string;
  time: string;
  items: OvalMenuItem[];
  onUpdate: (id: string, patch: Partial<OvalMenuItem>) => void;
  onToggleDiet: (item: OvalMenuItem, diet: OvalDiet) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/10 px-5 py-4 sm:px-6">
        <div>
          <h3 className="font-medium text-ink">{label}</h3>
          <p className="mt-1 text-xs text-subtle">{time}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line/20 px-4 text-xs font-medium text-ink hover:border-line/45"
        >
          <Plus className="h-3.5 w-3.5" /> Add dish
        </button>
      </header>
      {items.length ? (
        <div className="divide-y divide-line/10">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "grid gap-4 p-5 sm:grid-cols-[0.75fr_1.25fr] sm:p-6",
                item.needsReview && "bg-amber-500/[0.045]",
              )}
            >
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-subtle">
                  Category
                </span>
                <input
                  value={item.category}
                  onChange={(event) =>
                    onUpdate(item.id, { category: event.target.value })
                  }
                  className={inputCls}
                  aria-label={`${label} category`}
                />
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-subtle">
                  Dish
                </span>
                <input
                  value={item.dish}
                  onChange={(event) => onUpdate(item.id, { dish: event.target.value })}
                  className={inputCls}
                  aria-label={`${label} dish`}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                {DIETS.map((diet) => {
                  const checked = item.diets.includes(diet.id);
                  return (
                    <button
                      key={diet.id}
                      type="button"
                      onClick={() => onToggleDiet(item, diet.id)}
                      aria-pressed={checked}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs",
                        checked
                          ? "border-ink bg-ink text-bg"
                          : "border-line/15 text-muted hover:border-line/35",
                      )}
                    >
                      <span className="font-semibold">{diet.short}</span>
                      {diet.label}
                    </button>
                  );
                })}
                <span className="ml-auto text-[11px] tabular-nums text-subtle">
                  OCR {Math.round(item.confidence * 100)}%
                </span>
                {item.needsReview ? (
                  <button
                    type="button"
                    onClick={() => onUpdate(item.id, { needsReview: false })}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full bg-amber-500/12 px-3 text-xs font-medium text-amber-500"
                  >
                    <Check className="h-3.5 w-3.5" /> Mark reviewed
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="grid h-9 w-9 place-items-center rounded-full text-subtle hover:bg-rose-500/10 hover:text-rose-500"
                  aria-label={`Remove ${item.dish || "dish"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-muted">No {meal} items yet.</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 text-xs font-medium text-accent"
          >
            Add the first dish
          </button>
        </div>
      )}
    </section>
  );
}
