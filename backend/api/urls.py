from rest_framework.routers import DefaultRouter

<<<<<<< HEAD
from .views import GameViewSet

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")

urlpatterns = router.urls
=======
from .views import DeveloperViewSet, GameViewSet, GenreViewSet

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("genres", GenreViewSet, basename="genre")
router.register("developers", DeveloperViewSet, basename="developer")

urlpatterns = router.urls
>>>>>>> 545b656d9046f3b8c7538e94b1f2028bded6aef8
