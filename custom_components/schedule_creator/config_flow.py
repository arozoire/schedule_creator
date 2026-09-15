"""Config flow for Schedule Creator."""

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import CONFIG_ENTRY_TITLE, CONFIG_ENTRY_UNIQUE_ID, DOMAIN


class ScheduleCreatorConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create the single Schedule Creator config entry."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Handle user setup."""

        if user_input is not None:
            await self.async_set_unique_id(CONFIG_ENTRY_UNIQUE_ID)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title=CONFIG_ENTRY_TITLE, data={})

        return self.async_show_form(step_id="user")
