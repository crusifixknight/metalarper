from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core.management import call_command
from django.test import SimpleTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from . import services, steam
from .models import Developer, Game, Genre, SteamSnapshot


class GameCatalogTests(APITestCase):
    def setUp(self):
        self.developer = Developer.objects.create(name="CD Projekt Red")
        self.rpg = Genre.objects.create(name="RPG")
        self.game = Game.objects.create(
            title="The Witcher 3: Wild Hunt",
            release_year=2015,
            developer=self.developer,
            description="RPG",
        )
        self.game.genres.add(self.rpg)

    def test_catalog_is_public_and_paginated(self):
        response = self.client.get(reverse("game-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

        item = response.data["results"][0]
        self.assertEqual(item["title"], "The Witcher 3: Wild Hunt")
        self.assertEqual(item["release_year"], 2015)
        self.assertEqual(item["developer"]["name"], "CD Projekt Red")
        self.assertEqual(
            item["genres"],
            [{"id": self.rpg.id, "name": "RPG", "slug": "rpg"}],
        )

    def test_game_detail_by_slug(self):
        response = self.client.get(
            reverse("game-detail", kwargs={"slug": self.game.slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], self.game.slug)

    def test_age_rating_is_returned(self):
        self.game.age_rating = "18+"
        self.game.save()

        response = self.client.get(
            reverse("game-detail", kwargs={"slug": self.game.slug})
        )

        self.assertEqual(response.data["age_rating"], "18+")

    def test_slug_is_generated_and_unique(self):
        second = Game.objects.create(
            title="The Witcher 3: Wild Hunt",
            release_year=2015,
            developer=self.developer,
        )

        self.assertEqual(self.game.slug, "the-witcher-3-wild-hunt")
        self.assertEqual(second.slug, "the-witcher-3-wild-hunt-2")


class GameFilterTests(APITestCase):
    def setUp(self):
        self.dev1 = Developer.objects.create(name="CD Projekt Red")
        self.dev2 = Developer.objects.create(name="FromSoftware")
        self.rpg = Genre.objects.create(name="RPG")
        self.action = Genre.objects.create(name="Action")

        self.witcher = Game.objects.create(
            title="The Witcher 3",
            release_year=2015,
            developer=self.dev1,
        )
        self.witcher.genres.add(self.rpg)

        self.dark_souls = Game.objects.create(
            title="Dark Souls",
            release_year=2011,
            developer=self.dev2,
        )
        self.dark_souls.genres.add(self.rpg, self.action)

        self.elden_ring = Game.objects.create(
            title="Elden Ring",
            release_year=2022,
            developer=self.dev2,
        )
        self.elden_ring.genres.add(self.rpg)

    def _titles(self, response):
        return {item["title"] for item in response.data["results"]}

    def test_filter_by_genre_slug(self):
        response = self.client.get(reverse("game-list"), {"genres": "rpg"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)
        # проверка отсутствия дублей
        self.assertEqual(
            len(response.data["results"]),
            len({item["id"] for item in response.data["results"]}),
        )

    def test_filter_by_multiple_genres_or_logic(self):
        response = self.client.get(
            reverse("game-list"), {"genres": ["rpg", "action"]}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)

    def test_filter_by_developer(self):
        response = self.client.get(
            reverse("game-list"), {"developer": "fromsoftware"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), {"Dark Souls", "Elden Ring"})

    def test_filter_by_year_range(self):
        response = self.client.get(
            reverse("game-list"), {"year_from": 2012, "year_to": 2020}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), {"The Witcher 3"})

    def test_search_by_partial_title(self):
        response = self.client.get(reverse("game-list"), {"search": "souls"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), {"Dark Souls"})

    def test_combined_filters_and_logic(self):
        response = self.client.get(
            reverse("game-list"),
            {"genres": "rpg", "developer": "fromsoftware", "year_from": 2020},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._titles(response), {"Elden Ring"})

    def test_pagination_preserves_filters(self):
        # PAGE_SIZE = 12, поэтому чтобы проверить next, нужно > 12 игр.
        # Здесь проверяем, что count и results согласованы при фильтре.
        response = self.client.get(
            reverse("game-list"), {"genres": "rpg"}
        )
        self.assertEqual(response.data["count"], 3)

    def test_invalid_genre_returns_400(self):
        response = self.client.get(
            reverse("game-list"), {"genres": "no-such-genre"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_year_returns_400(self):
        response = self.client.get(
            reverse("game-list"), {"year_from": "abc"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_genres_endpoint_is_public(self):
        response = self.client.get(reverse("genre-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_developers_endpoint_is_public(self):
        response = self.client.get(reverse("developer-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

class SteamDataTests(APITestCase):
    def setUp(self):
        self.developer = Developer.objects.create(name="Valve")
        self.rpg = Genre.objects.create(name="RPG")
        self.game = Game.objects.create(
            title="Half-Life",
            release_year=1998,
            developer=self.developer,
            steam_appid=70,
        )
        self.game.genres.add(self.rpg)

    def tearDown(self):
        # �� ��������� �������� appid ����� �������.
        with services._in_flight_lock:
            services._in_flight_appids.clear()

    def _detail(self, game=None):
        game = game or self.game
        return self.client.get(
            reverse("game-detail", kwargs={"slug": game.slug})
        )

    def test_steam_is_null_without_appid(self):
        game = Game.objects.create(
            title="No Steam", release_year=2000, developer=self.developer
        )
        response = self._detail(game)
        self.assertIsNone(response.data["steam"])

    def test_steam_payload_comes_from_snapshot(self):
        moment = timezone.now()
        SteamSnapshot.objects.create(
            game=self.game,
            current_players=12000,
            rating_stars=Decimal("4.6"),
            rating_votes=500,
            last_updated=moment,
        )

        with mock.patch("api.services.threading.Thread") as thread_mock:
            response = self._detail()

        thread_mock.assert_not_called()
        steam_data = response.data["steam"]
        self.assertEqual(steam_data["appid"], 70)
        self.assertEqual(
            steam_data["store_url"],
            "https://store.steampowered.com/app/70/",
        )
        self.assertEqual(steam_data["current_players"], 12000)
        self.assertEqual(steam_data["rating_stars"], 4.6)
        self.assertEqual(steam_data["rating_votes"], 500)
        self.assertEqual(steam_data["last_updated"], moment.isoformat())
        self.assertFalse(steam_data["is_stale"])

    def test_stale_snapshot_is_served_and_refreshed_in_background(self):
        snapshot = SteamSnapshot.objects.create(
            game=self.game, current_players=42
        )
        SteamSnapshot.objects.filter(pk=snapshot.pk).update(
            refreshed_at=timezone.now()
            - services.STEAM_TTL
            - timedelta(minutes=1)
        )

        with mock.patch("api.services.threading.Thread") as thread_mock:
            response = self._detail()

        thread_mock.assert_called_once()
        steam_data = response.data["steam"]
        self.assertEqual(steam_data["current_players"], 42)
        self.assertTrue(steam_data["is_stale"])

    def test_missing_snapshot_returns_nulls_and_schedules_refresh(self):
        with mock.patch("api.services.threading.Thread") as thread_mock:
            response = self._detail()

        thread_mock.assert_called_once()
        steam_data = response.data["steam"]
        self.assertEqual(steam_data["appid"], 70)
        self.assertIsNone(steam_data["current_players"])
        self.assertIsNone(steam_data["rating_stars"])
        self.assertTrue(steam_data["is_stale"])

    def test_refresh_appid_stores_data(self):
        moment = timezone.now()
        with (
            mock.patch(
                "api.steam.fetch_current_players",
                return_value={"current_players": 321},
            ),
            mock.patch(
                "api.steam.fetch_rating",
                return_value={"rating_stars": 4.5, "rating_votes": 1000},
            ),
            mock.patch(
                "api.steam.fetch_last_updated",
                return_value={"last_updated": moment},
            ),
        ):
            services.refresh_appid(70)

        snapshot = SteamSnapshot.objects.get(game=self.game)
        self.assertEqual(snapshot.current_players, 321)
        self.assertEqual(float(snapshot.rating_stars), 4.5)
        self.assertEqual(snapshot.rating_votes, 1000)
        self.assertEqual(snapshot.last_updated, moment)

    def test_failed_refresh_keeps_previous_data(self):
        snapshot = SteamSnapshot.objects.create(
            game=self.game, current_players=5
        )
        SteamSnapshot.objects.filter(pk=snapshot.pk).update(
            refreshed_at=timezone.now()
            - services.STEAM_TTL
            - timedelta(minutes=1)
        )

        with (
            mock.patch("api.steam.fetch_current_players", return_value=None),
            mock.patch("api.steam.fetch_rating", return_value=None),
            mock.patch("api.steam.fetch_last_updated", return_value=None),
        ):
            services.refresh_appid(70)

        snapshot.refresh_from_db()
        self.assertEqual(snapshot.current_players, 5)
        self.assertTrue(services.is_stale(snapshot))

    def test_refresh_command_updates_stale_games(self):
        with mock.patch("api.services.refresh_appid") as refresh:
            call_command("refresh_steam", verbosity=0)

        refresh.assert_called_once_with(self.game.steam_appid)

    def test_refresh_command_skips_fresh_snapshots(self):
        SteamSnapshot.objects.create(game=self.game, current_players=5)

        with mock.patch("api.services.refresh_appid") as refresh:
            call_command("refresh_steam", verbosity=0)

        refresh.assert_not_called()

    def test_refresh_command_force_updates_fresh_snapshots(self):
        SteamSnapshot.objects.create(game=self.game, current_players=5)

        with mock.patch("api.services.refresh_appid") as refresh:
            call_command("refresh_steam", "--force", verbosity=0)

        refresh.assert_called_once_with(self.game.steam_appid)


class SteamRatingTests(SimpleTestCase):
    def test_stars_from_reviews(self):
        self.assertEqual(steam.stars_from_reviews(9, 1), 4.5)
        self.assertEqual(steam.stars_from_reviews(1, 0), 5.0)
        self.assertEqual(steam.stars_from_reviews(0, 1), 0.0)
        self.assertIsNone(steam.stars_from_reviews(0, 0))

    def test_stars_from_percent(self):
        self.assertEqual(steam.stars_from_percent(96), 4.8)
        self.assertEqual(steam.stars_from_percent(100), 5.0)
        self.assertEqual(steam.stars_from_percent(0), 0.0)
        self.assertIsNone(steam.stars_from_percent(101))

    def test_fetch_rating_falls_back_to_appreviews(self):
        with (
            mock.patch(
                "api.steam._rating_from_store_browse", return_value=None
            ),
            mock.patch(
                "api.steam._rating_from_appreviews",
                return_value={"rating_stars": 4.0, "rating_votes": 10},
            ) as fallback,
        ):
            result = steam.fetch_rating(70)

        fallback.assert_called_once_with(70)
        self.assertEqual(result["rating_stars"], 4.0)


class GameRelationsTests(APITestCase):
    def setUp(self):
        self.dev = Developer.objects.create(name="Studio")
        self.rpg = Genre.objects.create(name="RPG")
        self.action = Genre.objects.create(name="Action")
        self.strategy = Genre.objects.create(name="Strategy")

        self.alpha = Game.objects.create(
            title="Alpha", release_year=2001, developer=self.dev
        )
        self.beta = Game.objects.create(
            title="Beta", release_year=2002, developer=self.dev
        )
        self.gamma = Game.objects.create(
            title="Gamma", release_year=2003, developer=self.dev
        )
        self.delta = Game.objects.create(
            title="Delta", release_year=2004, developer=self.dev
        )
        self.epsilon = Game.objects.create(
            title="Epsilon", release_year=2005, developer=self.dev
        )

        self.alpha.genres.add(self.rpg, self.action)
        self.beta.genres.add(self.rpg)
        self.gamma.genres.add(self.action)
        self.delta.genres.add(self.rpg, self.action)
        self.epsilon.genres.add(self.strategy)

    def _items(self):
        response = self.client.get(reverse("game-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {item["slug"]: item for item in response.data["results"]}

    def test_related_games_are_returned(self):
        self.alpha.related_games.add(self.delta)

        item = self._items()[self.alpha.slug]

        self.assertEqual(
            [game["id"] for game in item["related_games"]],
            [self.delta.id],
        )
        self.assertEqual(
            set(item["related_games"][0]),
            {"id", "title", "slug", "release_year", "cover"},
        )

    def test_recommendations_sorted_by_shared_genres(self):
        item = self._items()[self.alpha.slug]

        ids = [game["id"] for game in item["recommended_games"]]

        self.assertEqual(ids, [self.delta.id, self.beta.id, self.gamma.id])

    def test_recommendations_exclude_games_without_common_genres(self):
        item = self._items()[self.epsilon.slug]

        self.assertEqual(item["recommended_games"], [])

    def test_recommendations_are_limited(self):
        for index in range(5):
            extra = Game.objects.create(
                title=f"Extra {index}", release_year=2010, developer=self.dev
            )
            extra.genres.add(self.rpg)

        item = self._items()[self.alpha.slug]

        self.assertEqual(
            len(item["recommended_games"]), services.RECOMMENDATIONS_LIMIT
        )
        self.assertEqual(item["recommended_games"][0]["id"], self.delta.id)

    def test_recommendations_are_returned_on_detail(self):
        response = self.client.get(
            reverse("game-detail", kwargs={"slug": self.alpha.slug})
        )

        ids = [game["id"] for game in response.data["recommended_games"]]

        self.assertIn(self.delta.id, ids)
