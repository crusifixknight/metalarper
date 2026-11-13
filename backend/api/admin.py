from django.contrib import admin

from .models import Developer, Game


@admin.register(Developer)
class DeveloperAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("title", "release_year", "developer", "created_at")
    list_filter = ("developer", "release_year")
    search_fields = ("title", "developer__name")
    list_select_related = ("developer",)
