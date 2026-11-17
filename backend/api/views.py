<<<<<<< HEAD
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Game
from .serializers import GameSerializer


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only game catalog."""

    queryset = Game.objects.select_related("developer").prefetch_related("genres")
    serializer_class = GameSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
=======
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
>>>>>>> 545b656d9046f3b8c7538e94b1f2028bded6aef8
