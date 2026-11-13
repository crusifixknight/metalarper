from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Developer, Game


class GameCatalogTests(APITestCase):
    def setUp(self):
        self.developer = Developer.objects.create(name="CD Projekt Red")
        self.game = Game.objects.create(
            title="The Witcher 3: Wild Hunt",
            release_year=2015,
            developer=self.developer,
            description="RPG",
        )

    def test_catalog_is_public_and_paginated(self):
        response = self.client.get(reverse("game-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

        item = response.data["results"][0]
        self.assertEqual(item["title"], "The Witcher 3: Wild Hunt")
        self.assertEqual(item["release_year"], 2015)
        self.assertEqual(item["developer"]["name"], "CD Projekt Red")

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
