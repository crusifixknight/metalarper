import FilterSidebar from "@/components/FilterSidebar";
import {
  getFacets,
  parseCatalogFilters,
  type CatalogFacets,
  type CatalogSearchParams,
} from "@/lib/api";

type CatalogFiltersProps = {
  searchParams: Promise<CatalogSearchParams>;
};

/**
 * Серверная часть фильтров: читает параметры из URL и загружает справочники
 * жанров и студий. Пока API недоступен, сайдбар показывает пояснение вместо
 * формы.
 */
export default async function CatalogFilters({
  searchParams,
}: CatalogFiltersProps) {
  const filters = parseCatalogFilters(await searchParams);

  let facets: CatalogFacets | null = null;

  try {
    facets = await getFacets();
  } catch {
    facets = null;
  }

  return <FilterSidebar filters={filters} facets={facets} />;
}
