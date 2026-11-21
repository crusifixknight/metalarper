from django.core.management.base import BaseCommand

from api import services
from api.models import Game


class Command(BaseCommand):
    help = "Обновляет кэш Steam-данных: игроки, рейтинг, дата обновления."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Обновить все снимки, даже если они ещё свежие.",
        )

    def handle(self, *args, **options):
        games = list(
            Game.objects.exclude(steam_appid=None).select_related(
                "steam_snapshot"
            )
        )

        if not options["force"]:
            games = [game for game in games if services.needs_refresh(game)]

        if not games:
            self.stdout.write("Все Steam-снимки свежие, обновлять нечего.")
            return

        services.refresh_games_sync(games)
        self.stdout.write(
            self.style.SUCCESS(f"Обработано игр: {len(games)}.")
        )
