from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


def unique_slug(model, value, instance_pk=None):
    """Build a unique slug for model, appending -2, -3 ... on collisions."""
    base = slugify(value, allow_unicode=True) or "item"
    candidate = base
    suffix = 2
    queryset = model.objects.all()
    if instance_pk is not None:
        queryset = queryset.exclude(pk=instance_pk)
    while queryset.filter(slug=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


class Developer(models.Model):
    name = models.CharField("название", max_length=255, unique=True)
    slug = models.SlugField("slug", max_length=255, unique=True, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "студия"
        verbose_name_plural = "студии"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Developer, self.name, self.pk)
        super().save(*args, **kwargs)


class Genre(models.Model):
    name = models.CharField("название", max_length=100, unique=True)
    slug = models.SlugField("slug", max_length=100, unique=True, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "жанр"
        verbose_name_plural = "жанры"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Genre, self.name, self.pk)
        super().save(*args, **kwargs)


class Game(models.Model):
    title = models.CharField("название", max_length=255)
    slug = models.SlugField("slug", max_length=255, unique=True, blank=True)
    release_year = models.PositiveSmallIntegerField(
        "год выпуска",
        validators=[MinValueValidator(1950)],
        db_index=True,
    )
    developer = models.ForeignKey(
        Developer,
        verbose_name="студия разработки",
        related_name="games",
        on_delete=models.PROTECT,
    )
    genres = models.ManyToManyField(
        Genre,
        verbose_name="жанры",
        related_name="games",
        blank=True,
    )
    description = models.TextField("описание", blank=True)
    age_rating = models.CharField(
        "возрастной рейтинг",
        max_length=32,
        blank=True,
        help_text="Например: 18+, PEGI 16, ESRB M.",
    )
    cover = models.ImageField("обложка", upload_to="games/covers/", blank=True)
    created_at = models.DateTimeField("добавлена", auto_now_add=True)
    steam_appid = models.PositiveIntegerField(
        "Steam AppID",
        null=True,
        blank=True,
        unique=True,
        help_text="ID игры в Steam; нужен для игроков, рейтинга и даты обновления.",
    )
    related_games = models.ManyToManyField(
        "self",
        verbose_name="связанные игры",
        related_name="related_to",
        symmetrical=False,
        blank=True,
        help_text="Игры той же вселенной или сюжетной линии.",
    )

    class Meta:
        ordering = ["title"]
        verbose_name = "игра"
        verbose_name_plural = "игры"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Game, self.title, self.pk)
        super().save(*args, **kwargs)


class SteamSnapshot(models.Model):
    """Кэш внешних данных Steam для карточки игры.

    Значения обновляются фоновыми запросами к публичным эндпоинтам Steam
    (игроки, обзоры, новости). Пока данные свежие, API отдаёт их из этой
    таблицы и не ходит во внешние сервисы.
    """

    game = models.OneToOneField(
        Game,
        verbose_name="игра",
        related_name="steam_snapshot",
        on_delete=models.CASCADE,
    )
    current_players = models.PositiveIntegerField(
        "активных игроков", null=True, blank=True
    )
    rating_stars = models.DecimalField(
        "рейтинг, звёзды",
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
    )
    rating_votes = models.PositiveIntegerField("оценок", null=True, blank=True)
    last_updated = models.DateTimeField("последнее обновление игры", null=True, blank=True)
    refreshed_at = models.DateTimeField("обновлён", auto_now=True)

    class Meta:
        verbose_name = "снимок Steam"
        verbose_name_plural = "снимки Steam"

    def __str__(self):
        return f"Steam-данные: {self.game.title}"
