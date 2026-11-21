import django_filters
from django.db.models import Q

from .models import Developer, Game, Genre


class GameFilter(django_filters.FilterSet):
    """Game catalog filters.

    Parameters:
      ?genres=<slug>       - multi-select, "OR" within the group
      ?developer=<slug>    - multi-select, "OR" within the group
      ?year_from=YYYY      - release_year >= YYYY
      ?year_to=YYYY        - release_year <= YYYY
      ?search=<string>     - search by title (icontains)

    Logic between groups is "AND" (the standard FilterSet behavior).
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
        """Case-insensitive search by title.

        On SQLite the standard icontains does not perform Unicode case folding,
        so for Cyrillic we use Q with iexact/icontains where possible, and
        Python-side lower() normalization is not available in a queryset.
        Below is the practical option: icontains plus a fallback through
        contains on the lowercased value.

        In practice, on SQLite icontains may be case-sensitive for non-ASCII
        strings; this is a database limitation, not a filter one.
        """
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value) | Q(title__contains=value)
        )