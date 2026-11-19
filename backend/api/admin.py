from django.contrib import admin

from .models import Developer, Game, Genre, SteamSnapshot


@admin.register(Developer)
class DeveloperAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "release_year",
        "developer",
        "age_rating",
        "steam_appid",
        "created_at",
    )
    list_filter = ("developer", "genres", "release_year")
    search_fields = (
        "title",
        "developer__name",
        "genres__name",
        "=steam_appid",
    )
    list_select_related = ("developer",)
    filter_horizontal = ("genres", "related_games")
    fieldsets = (
        (None, {"fields": ("title", "slug", "release_year", "developer")}),
        ("Каталог", {"fields": ("genres", "related_games", "description", "age_rating", "cover")}),
        ("Steam", {"fields": ("steam_appid",)}),
    )


@admin.register(SteamSnapshot)
class SteamSnapshotAdmin(admin.ModelAdmin):
    """Кэш только для чтения: данные заполняются фоновыми запросами."""

    list_display = (
        "game",
        "current_players",
        "rating_stars",
        "rating_votes",
        "last_updated",
        "refreshed_at",
    )
    list_select_related = ("game",)
    search_fields = ("game__title", "game__steam_appid")
    readonly_fields = (
        "game",
        "current_players",
        "rating_stars",
        "rating_votes",
        "last_updated",
        "refreshed_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
