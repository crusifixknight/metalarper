from rest_framework import serializers

from .models import Developer, Game, Genre


class DeveloperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Developer
        fields = ("id", "name", "slug")


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ("id", "name", "slug")


class GameSerializer(serializers.ModelSerializer):
    developer = DeveloperSerializer(read_only=True)
    genres = GenreSerializer(many=True, read_only=True)

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
            "cover",
        )
