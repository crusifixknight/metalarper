from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from . import services
from .models import Developer, Game, Genre

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    """Public sign-up: validates credentials and creates a regular user."""

    username = serializers.CharField(
        max_length=150,
        validators=[UnicodeUsernameValidator()],
    )
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with that username already exists."
            )
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with that email already exists."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        candidate = User(username=attrs["username"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Authenticate an existing user by username and password."""

    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise AuthenticationFailed(
                {
                    "detail": "Invalid username or password.",
                    "code": "invalid_credentials",
                }
            )

        self.user = user
        return attrs


class DeveloperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Developer
        fields = ("id", "name", "slug")


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ("id", "name", "slug")


class GameBriefSerializer(serializers.ModelSerializer):
    """Short card used for related and recommended games."""

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
        """Steam data from the cache; without a snapshot - nulls and is_stale=true."""
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
