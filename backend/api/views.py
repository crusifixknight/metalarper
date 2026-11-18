from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .filters import GameFilter
from .models import Developer, Game, Genre
from .serializers import (
    DeveloperSerializer,
    GameSerializer,
    GenreSerializer,
    RegisterSerializer,
    UserSerializer,
)


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


class RegisterView(APIView):
    """Public registration: creates a user and returns JWT tokens."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
