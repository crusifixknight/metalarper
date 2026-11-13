from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Game
from .serializers import GameSerializer


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only game catalog."""

    queryset = Game.objects.select_related("developer").all()
    serializer_class = GameSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
