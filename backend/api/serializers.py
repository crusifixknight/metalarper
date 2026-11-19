from rest_framework import serializers

from . import services
from .models import Developer, Game, Genre


class DeveloperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Developer
        fields = ("id", "name", "slug")


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ("id", "name", "slug")


class GameBriefSerializer(serializers.ModelSerializer):
    """Короткая карточка для связанных и рекомендованных игр."""

    class Meta:
        model = Game
        fields = ("id", "title", "slug", "release_year", "cover")


class GameSerializer(serializers.ModelSerializer):
    developer = DeveloperSerializer(read_only=True)
    genres = GenreSerializer(many=True, read_only=True)
    steam = serializers.SerializerMethodField()
    related_games = serializers.SerializerMethodField()
    recommended_games = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = (
            "id",
            "title",
            "slug",
            "release_year",
            "developer",
            "genres",
            "description",
            "age_rating",
            "cover",
            "steam",
            "related_games",
            "recommended_games",
        )

    def get_steam(self, obj: Game):
        """Данные Steam из кэша; пока снимка нет — null-поля и is_stale=true."""
        appid = obj.steam_appid
        if not appid:
            return None

        snapshot = services.get_snapshot(obj)

        return {
            "appid": appid,
            "store_url": services.store_url(appid),
            "current_players": (
                snapshot.current_players if snapshot else None
            ),
            "rating_stars": (
                float(snapshot.rating_stars)
                if snapshot and snapshot.rating_stars is not None
                else None
            ),
            "rating_votes": snapshot.rating_votes if snapshot else None,
            "last_updated": (
                snapshot.last_updated.isoformat()
                if snapshot and snapshot.last_updated
                else None
            ),
            "is_stale": services.is_stale(snapshot),
        }

    def get_related_games(self, obj: Game):
        return GameBriefSerializer(
            obj.related_games.all(), many=True, context=self.context
        ).data

    def get_recommended_games(self, obj: Game):
        recommendations = self.context.get("recommendations") or {}
        games = recommendations.get(obj.id, [])
        return GameBriefSerializer(
            games, many=True, context=self.context
        ).data
