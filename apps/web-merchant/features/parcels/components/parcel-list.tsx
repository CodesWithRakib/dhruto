"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  type ColumnDef,
} from "@dhruto/ui";
import { ChevronLeft, ChevronRight, Eye, Filter, Hash, Plus, Printer, Search } from "lucide-react";
import type { ParcelListItem } from "@dhruto/contracts";
import { Link } from "@/lib/navigation";
import { useRouteBase } from "@/config/route-base";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState, ErrorState, LoadingState, RetryButton } from "@/components/feedback/states";
import { useParcelsList } from "../hooks/use-parcels-list";
import { ParcelFilterControls } from "./parcel-filters";
import { ParcelCard } from "./parcel-card";

export function ParcelList() {
  const t = useTranslations("ParcelList");
  const routes = useRouteBase();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    parcels,
    pagination,
    isLoading,
    isFetching,
    isError,
    refetch,
    page,
    limit,
    setLimit,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    activeFilterCount,
  } = useParcelsList();

  const createHref = routes.createBooking;
  const totalItems = pagination?.total ?? parcels.length;
  const totalPages = pagination?.totalPages ?? 1;

  const columns: ColumnDef<ParcelListItem>[] = useMemo(
    () => [
      {
        accessorKey: "trackingCode",
        header: t("tracking"),
        cell: ({ row }) => (
          <Link
            href={routes.parcel(row.original.id)}
            className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline"
          >
            <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {row.original.trackingCode}
          </Link>
        ),
      },
      {
        accessorKey: "recipientName",
        header: t("recipient"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.recipientName}</p>
            <p className="mt-0.5 font-mono text-caption text-muted-foreground">
              {row.original.recipientPhone}
            </p>
          </div>
        ),
      },
      {
        id: "destination",
        header: t("address"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.thana}, {row.original.district}
            </p>
            <p
              className="mt-0.5 max-w-[220px] truncate text-caption text-muted-foreground"
              title={row.original.deliveryAddress}
            >
              {row.original.deliveryAddress}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "codAmount",
        header: t("cod"),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              ৳{row.original.codAmount.toLocaleString()}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {t("fee")} ৳{row.original.deliveryFee.toLocaleString()}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: t("date"),
        cell: ({ row }) => {
          const created = new Date(row.original.createdAt);
          return (
            <div className="text-caption text-muted-foreground">
              <span>{created.toLocaleDateString()}</span>
              <br />
              <span>
                {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="block text-right">{t("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={routes.parcelLabel(row.original.id)}
              aria-label={t("printLabel")}
              title={t("printLabel")}
            >
              <Button variant="ghost" size="icon-sm" aria-label={t("printLabel")}>
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href={routes.parcel(row.original.id)}>
              <Button variant="outline" size="sm" className="gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {t("view")}
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [t, routes],
  );

  const hasNoResults = !isLoading && !isError && parcels.length === 0;

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-border sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-h3">{t("title")}</CardTitle>
            <CardDescription className="mt-1">{t("description")}</CardDescription>
          </div>
          {createHref ? (
            <Link href={createHref}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("create")}
              </Button>
            </Link>
          ) : null}
        </CardHeader>
      </Card>

      {/* Search + mobile filter trigger */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setFiltersOpen(true)}
          className="gap-2 lg:hidden"
          aria-expanded={filtersOpen}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          {t("filters")}
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      {/* Desktop filters */}
      <div className="hidden rounded-md border border-border bg-surface p-4 lg:block">
        <ParcelFilterControls
          idPrefix="desktop"
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Mobile filter sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("filters")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ParcelFilterControls
              idPrefix="mobile"
              stacked
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              {t("applyFilters")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* States */}
      {isError ? (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            title={t("loadErrorTitle")}
            description={t("loadErrorDescription")}
            action={<RetryButton label={t("retry")} onRetry={() => void refetch()} />}
          />
        </div>
      ) : isLoading ? (
        <div className="rounded-md border border-border bg-surface">
          <LoadingState title={t("loading")} />
        </div>
      ) : hasNoResults ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            title={activeFilterCount > 0 ? t("noResultsTitle") : t("emptyTitle")}
            description={
              activeFilterCount > 0 ? t("noResultsDescription") : t("emptyDescription")
            }
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t("clearFilters")}
                </Button>
              ) : createHref ? (
                <Link href={createHref}>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("create")}
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              data={parcels}
              isLoading={isFetching && parcels.length === 0}
              totalItems={totalItems}
              pageCount={totalPages}
              currentPage={page}
              itemsPerPage={limit}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
              emptyMessage={t("emptyTitle")}
            />
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden">
            <ul className="space-y-3">
              {parcels.map((parcel) => (
                <ParcelCard key={parcel.id} parcel={parcel} />
              ))}
            </ul>
          </div>

          {/* Mobile pager */}
          <nav
            aria-label={t("paginationLabel")}
            className="flex items-center justify-between gap-3 lg:hidden"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t("previous")}
            </Button>
            <span className="text-caption text-muted-foreground">
              {t("pageOf", { page, totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage(page + 1)}
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
