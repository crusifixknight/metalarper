from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .filters import GameFilter
from .models import Developer, Game, Genre
from .serializers import DeveloperSerializer, GameSerializer, GenreSerializer


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    """Публичный read-only каталог игр с фильтрацией."""

    serializer_class = GameSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    filter_backends = [DjangoFilterBackend]
    filterset_class = GameFilter

    def get_queryset(self):
        return (
            Game.objects.select_related("developer")
            .prefetch_related("genres")
            .distinct()
        )


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    """Справочник жанров для фильтров."""

    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class DeveloperViewSet(viewsets.ReadOnlyModelViewSet):
    """Справочник студий для фильтров."""

    queryset = Developer.objects.all()
    serializer_class = DeveloperSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
