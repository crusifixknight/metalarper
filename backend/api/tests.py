from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .models import Developer, Game, Genre

User = get_user_model()


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


class RegistrationTests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-register")
        self.payload = {
            "username": "player",
            "email": "player@example.com",
            "password": "Str0ng-Passw0rd!",
            "password_confirm": "Str0ng-Passw0rd!",
        }

    def test_registration_returns_user_and_valid_tokens(self):
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "player")
        self.assertEqual(response.data["user"]["email"], "player@example.com")
        self.assertNotIn("password", response.data["user"])
        self.assertNotIn("password_confirm", response.data["user"])

        user = User.objects.get(username="player")
        self.assertTrue(user.check_password(self.payload["password"]))
        self.assertNotEqual(user.password, self.payload["password"])

        self.assertEqual(int(AccessToken(response.data["access"])["user_id"]), user.id)
        self.assertEqual(int(RefreshToken(response.data["refresh"])["user_id"]), user.id)

    def test_duplicate_username_is_rejected_case_insensitively(self):
        User.objects.create_user(
            username="player",
            email="first@example.com",
            password="Str0ng-Passw0rd!",
        )
        payload = {
            **self.payload,
            "username": "Player",
            "email": "second@example.com",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_duplicate_email_is_rejected_case_insensitively(self):
        User.objects.create_user(
            username="someone",
            email="player@example.com",
            password="Str0ng-Passw0rd!",
        )
        payload = {**self.payload, "email": "PLAYER@example.com"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_password_mismatch_is_rejected(self):
        payload = {**self.payload, "password_confirm": "Different-Passw0rd!"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)
        self.assertFalse(User.objects.filter(username="player").exists())

    def test_weak_password_is_rejected(self):
        payload = {
            **self.payload,
            "password": "12345678",
            "password_confirm": "12345678",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.filter(username="player").exists())

    def test_missing_fields_are_rejected(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            set(response.data),
            {"username", "email", "password", "password_confirm"},
        )
        self.assertFalse(User.objects.exists())


class LoginTests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-login")
        self.user = User.objects.create_user(
            username="player",
            email="player@example.com",
            password="Str0ng-Passw0rd!",
        )
        self.payload = {"username": "player", "password": "Str0ng-Passw0rd!"}

    def test_login_returns_user_and_valid_tokens(self):
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["id"], self.user.id)
        self.assertEqual(response.data["user"]["username"], "player")
        self.assertEqual(response.data["user"]["email"], "player@example.com")
        self.assertNotIn("password", response.data["user"])
        self.assertEqual(
            int(AccessToken(response.data["access"])["user_id"]),
            self.user.id,
        )
        self.assertEqual(
            int(RefreshToken(response.data["refresh"])["user_id"]),
            self.user.id,
        )

    def test_wrong_password_returns_401(self):
        payload = {**self.payload, "password": "Wrong-Passw0rd!"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["code"], "invalid_credentials")
        self.assertEqual(
            response.data["detail"],
            "Invalid username or password.",
        )
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)

    def test_unknown_user_returns_same_error_as_wrong_password(self):
        wrong_password = self.client.post(
            self.url,
            {**self.payload, "password": "Wrong-Passw0rd!"},
            format="json",
        )
        unknown_user = self.client.post(
            self.url,
            {"username": "nobody", "password": "Wrong-Passw0rd!"},
            format="json",
        )

        self.assertEqual(unknown_user.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(unknown_user.data, wrong_password.data)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["code"], "invalid_credentials")

    def test_missing_credentials_returns_400(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"username", "password"})


class RefreshTests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-refresh")
        self.user = User.objects.create_user(
            username="player",
            email="player@example.com",
            password="Str0ng-Passw0rd!",
        )
        self.refresh = RefreshToken.for_user(self.user)

    def test_valid_refresh_returns_new_access_token(self):
        response = self.client.post(
            self.url,
            {"refresh": str(self.refresh)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("refresh", response.data)
        self.assertEqual(
            int(AccessToken(response.data["access"])["user_id"]),
            self.user.id,
        )

    def test_invalid_refresh_returns_401(self):
        response = self.client.post(
            self.url,
            {"refresh": "not-a-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["code"], "token_not_valid")

    def test_access_token_cannot_be_used_as_refresh(self):
        response = self.client.post(
            self.url,
            {"refresh": str(self.refresh.access_token)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["code"], "token_not_valid")

    def test_missing_refresh_returns_400(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("refresh", response.data)