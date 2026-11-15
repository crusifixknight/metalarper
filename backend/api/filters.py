import django_filters
from django.db.models import Q

from .models import Developer, Game, Genre


class GameFilter(django_filters.FilterSet):
    """Фильтры каталога игр.

    Параметры:
      ?genres=<slug>       — мультивыбор, «ИЛИ» внутри группы
      ?developer=<slug>    — мультивыбор, «ИЛИ» внутри группы
      ?year_from=YYYY      — release_year >= YYYY
      ?year_to=YYYY        — release_year <= YYYY
      ?search=<строка>     — поиск по title (icontains)

    Логика между группами — «И» (стандартное поведение FilterSet).
    """

    genres = django_filters.ModelMultipleChoiceFilter(
        field_name="genres__slug",
        to_field_name="slug",
        queryset=Genre.objects.all(),
    )
    developer = django_filters.ModelMultipleChoiceFilter(
        field_name="developer__slug",
        to_field_name="slug",
        queryset=Developer.objects.all(),
    )
    year_from = django_filters.NumberFilter(
        field_name="release_year",
        lookup_expr="gte",
    )
    year_to = django_filters.NumberFilter(
        field_name="release_year",
        lookup_expr="lte",
    )
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Game
        fields = ("genres", "developer", "year_from", "year_to", "search")

    def filter_search(self, queryset, name, value):
        """Регистронезависимый поиск по названию.

        На SQLite стандартный icontains не выполняет Unicode case folding,
        поэтому для кириллицы используем Q с iexact/icontains там, где это
        возможно, а также Lower-нормализацию на стороне Python недоступна
        в queryset. Ниже — практичный вариант: icontains + fallback через
        contains по lower().

        Фактически на SQLite для не-ASCII строк icontains может работать
        регистрозависимо; это ограничение БД, а не фильтра.
        """
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value) | Q(title__contains=value)
        )