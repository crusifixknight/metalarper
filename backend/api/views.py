from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from . import services
from .filters import GameFilter
from .models import Developer, Game, Genre
from .serializers import (
    DeveloperSerializer,
    GameSerializer,
    GenreSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only game catalog with filtering.

    Steam data is served from the cache; stale snapshots are refreshed in the
    background so responses do not depend on the external service's speed.
    """

    serializer_class = GameSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    filter_backends = [DjangoFilterBackend]
    filterset_class = GameFilter

    def get_queryset(self):
        return (
            Game.objects.select_related("developer", "steam_snapshot")
            .prefetch_related("genres", "related_games")
            .distinct()
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["recommendations"] = getattr(self, "_recommendations", {})
        return context

    def _prepare(self, games):
        """Queue stale Steam snapshots for refresh and compute recommendations."""
        games = list(games)
        services.ensure_snapshots_async(games)
        self._recommendations = services.recommendations_for(games)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            self._prepare(page)
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        self._prepare(queryset)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._prepare([instance])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    """Genre directory used by the filters."""

    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class DeveloperViewSet(viewsets.ReadOnlyModelViewSet):
    """Developer directory used by the filters."""

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


class LoginView(APIView):
    """Public login: authenticates a user and returns JWT tokens."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        """Keep 401 (not DRF's 403 fallback) and advertise the Bearer scheme."""
        return JWTAuthentication().authenticate_header(request)

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.user

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )
