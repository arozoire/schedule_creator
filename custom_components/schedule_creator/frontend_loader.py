"""Serve the dashboard card through an uncached, content-versioned loader."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from aiohttp import web
from homeassistant.components.http.server import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.http import HomeAssistantView
from homeassistant.util.hass_dict import HassKey

from .const import DOMAIN

BUNDLE_NAME = "schedule-creator-card.js"
BUNDLE_DIRECTORY = Path(__file__).parent / "frontend"
STATIC_URL = f"/{DOMAIN}/static"
# Stable URL used by existing Lovelace resources; it now returns the loader.
LOADER_URL = f"/{DOMAIN}/frontend/{BUNDLE_NAME}"
_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}.frontend_loader_registered")


def bundle_fingerprint(path: Path = BUNDLE_DIRECTORY / BUNDLE_NAME) -> str:
    """Return a short content hash; HACS may replace the file without a restart."""

    return sha256(path.read_bytes()).hexdigest()[:16]


def loader_source(fingerprint: str) -> str:
    """Import the bundle at a URL that changes whenever its content changes."""

    return f'import "{STATIC_URL}/{BUNDLE_NAME}?v={fingerprint}";\n'


class ScheduleCreatorLoaderView(HomeAssistantView):
    """Tiny module that browsers must revalidate on every dashboard load."""

    url = LOADER_URL
    name = f"{DOMAIN}:frontend_loader"
    requires_auth = False

    def __init__(self) -> None:
        self._cache: tuple[tuple[int, int], str] | None = None

    def _fingerprint(self) -> str:
        path = BUNDLE_DIRECTORY / BUNDLE_NAME
        stat = path.stat()
        key = (stat.st_mtime_ns, stat.st_size)
        if self._cache is None or self._cache[0] != key:
            self._cache = (key, bundle_fingerprint(path))
        return self._cache[1]

    async def get(self, request: web.Request) -> web.Response:
        """Return the loader; query strings such as hacstag or v are ignored."""

        hass: HomeAssistant = request.app["hass"]
        fingerprint = await hass.async_add_executor_job(self._fingerprint)
        return web.Response(
            text=loader_source(fingerprint),
            content_type="application/javascript",
            headers={"Cache-Control": "no-store"},
        )


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register routes once per HA process and auto-load the card if possible."""

    if hass.http is None or hass.data.get(_REGISTERED):
        return
    hass.http.register_view(ScheduleCreatorLoaderView())
    # The versioned query makes a long browser cache safe for the bundle itself.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(BUNDLE_DIRECTORY), cache_headers=True)]
    )
    if "frontend" in hass.config.components:
        from homeassistant.components.frontend import add_extra_js_url

        # Existing manual resources keep working: every loader URL imports the
        # same versioned bundle URL, so the browser evaluates it only once.
        add_extra_js_url(hass, LOADER_URL)
    hass.data[_REGISTERED] = True
