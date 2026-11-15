import { Suspense } from "react";

import CatalogResults from "@/components/CatalogResults";
import CatalogSkeleton from "@/components/CatalogSkeleton";
import FilterSidebar from "@/components/FilterSidebar";

type CatalogPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <div className="max-w-7xl mx-auto p-4 font-sans text-sm">
      {/* Заголовок */}
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">Каталог игр</h2>
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
          <FilterSidebar />
        </aside>
      </div>
    </div>
  );
}
