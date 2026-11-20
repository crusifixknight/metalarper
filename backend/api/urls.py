from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import DeveloperViewSet, GameViewSet, GenreViewSet, LoginView, RegisterView

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("genres", GenreViewSet, basename="genre")
router.register("developers", DeveloperViewSet, basename="developer")

urlpatterns = router.urls + [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
]
