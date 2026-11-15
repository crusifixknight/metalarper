// Сайдбар фильтров. Бэкенд пока не принимает параметры фильтрации,
// поэтому контролы отключены и не создают ложного ощущения работы.

function FilterSelect({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
        {label}
      </label>
      <select className="w-full rounded border border-gray-300 bg-white p-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:disabled:bg-gray-800">
        <option value="">любой</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FilterSidebar() {
  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="mb-4 text-lg font-bold">ФИЛЬТРЫ</h3>

      <fieldset disabled aria-describedby="filters-note">
        <FilterSelect
          label="Сортировка"
          options={["по дате выхода", "по алфавиту"]}
        />
        <FilterSelect
          label="Жанр"
          options={["RPG", "Экшен", "Стратегия", "Симулятор", "Хоррор"]}
        />
        <FilterSelect
          label="Год выхода"
          options={["2024", "2023", "2022", "2021", "2020"]}
        />
      </fieldset>

      <p
        id="filters-note"
        className="mt-4 rounded bg-gray-50 p-2 text-xs leading-relaxed text-gray-500 dark:bg-gray-900"
      >
        API пока не поддерживает фильтрацию и сортировку, поэтому поля
        отключены. Каталог, пагинация и карточки уже работают с реальными
        данными бэкенда.
      </p>
    </div>
  );
}
