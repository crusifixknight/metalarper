from rest_framework.routers import DefaultRouter

from .views import DeveloperViewSet, GameViewSet, GenreViewSet

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("genres", GenreViewSet, basename="genre")
router.register("developers", DeveloperViewSet, basename="developer")

urlpatterns = router.urls
