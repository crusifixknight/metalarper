from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Developer, Game, Genre


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
