import { Suspense } from "react";

import CatalogFilters from "@/components/CatalogFilters";
import CatalogResults from "@/components/CatalogResults";
import CatalogSearch, {
  CatalogSearchSkeleton,
} from "@/components/CatalogSearch";
import CatalogSkeleton from "@/components/CatalogSkeleton";
import { FilterSidebarSkeleton } from "@/components/FilterSidebar";
import type { CatalogSearchParams } from "@/lib/api";

type CatalogPageProps = {
  searchParams: Promise<CatalogSearchParams>;
};

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <div className="max-w-7xl mx-auto p-4 font-sans text-sm">
      {/* Заголовок и поиск */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Каталог игр</h2>
        <Suspense fallback={<CatalogSearchSkeleton />}>
          <CatalogSearch searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Основной макет: сетка слева, фильтры справа */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Левая часть - сетка игр */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<CatalogSkeleton />}>
            <CatalogResults searchParams={searchParams} />
          </Suspense>
        </div>

        {/* Правая часть - фильтры */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <Suspense fallback={<FilterSidebarSkeleton />}>
            <CatalogFilters searchParams={searchParams} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
