"use client";

import * as React from "react";
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  flexRender,
  globalFilteringFeature,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const CLIENT_TABLE_FEATURES = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
});

export type DataTableFeatures = typeof CLIENT_TABLE_FEATURES;
export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  unknown
>;

export function DataTable<TData extends RowData>({
  data,
  columns,
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Chưa có dữ liệu.",
  serverSide = false,
  searchValue,
  onSearchChange,
  toolbarSlot,
}: {
  data: TData[];
  columns: DataTableColumn<TData>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  serverSide?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  toolbarSlot?: React.ReactNode;
}) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const controlledSearch = searchValue !== undefined && onSearchChange !== undefined;

  const features = React.useMemo(
    () =>
      serverSide
        ? CLIENT_TABLE_FEATURES
        : tableFeatures({
            columnFilteringFeature,
            globalFilteringFeature,
            rowPaginationFeature,
            filteredRowModel: createFilteredRowModel(),
            paginatedRowModel: createPaginatedRowModel(),
          }),
    [serverSide]
  );

  const table = useTable<
    DataTableFeatures,
    TData,
    {
      globalFilter: string | undefined;
      pagination: { pageIndex: number; pageSize: number } | undefined;
    }
  >(
    {
      features,
      data,
      columns,
      state: serverSide ? {} : { globalFilter, pagination },
      onGlobalFilterChange: serverSide ? undefined : setGlobalFilter,
      onPaginationChange: serverSide ? undefined : setPagination,
      manualFiltering: serverSide,
      manualPagination: serverSide,
    },
    (state) => ({
      globalFilter: state.globalFilter,
      pagination: state.pagination,
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={controlledSearch ? searchValue : globalFilter}
            onChange={(e) =>
              controlledSearch
                ? onSearchChange(e.target.value)
                : setGlobalFilter(e.target.value)
            }
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {toolbarSlot ? (
          <div className="flex flex-wrap items-center gap-2">{toolbarSlot}</div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!serverSide && table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Trang {(table.state.pagination?.pageIndex ?? 0) + 1} /{" "}
            {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
