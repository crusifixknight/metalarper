from rest_framework import serializers

from .models import Developer, Game


class DeveloperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Developer
        fields = ("id", "name", "slug")


class GameSerializer(serializers.ModelSerializer):
    developer = DeveloperSerializer(read_only=True)

    class Meta:
        model = Game
        fields = (
            "id",
            "title",
            "slug",
            "release_year",
            "developer",
            "description",
            "cover",
        )
