from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DeveloperViewSet, GameViewSet, GenreViewSet, RegisterView

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("genres", GenreViewSet, basename="genre")
router.register("developers", DeveloperViewSet, basename="developer")

urlpatterns = router.urls + [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
]
