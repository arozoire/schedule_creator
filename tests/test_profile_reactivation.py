"""A profile switched back on during a slot runs that slot again (#83)."""

from test_quick_timer_handover import _Home, _start

from custom_components.schedule_creator.const import DOMAIN


async def _profile(home, active):
    await home.hass.services.async_call(
        DOMAIN, "set_profile", {"profile": "Home", "active": active}, blocking=True
    )
    await home.hass.async_block_till_done()


async def test_reactivated_profile_resumes_the_running_slot(
    hass, hass_ws_client, freezer
):
    """Off mid-slot: end action; on again in the same slot: start action again."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 6, 20, 18)])
    await home.move(1)  # 17:00 slot starts
    assert home.calls == [20]
    await home.move(2)
    await _profile(home, False)  # 18:40 profile off: the slot ends early
    assert home.calls == [20, 18]
    await _profile(home, True)  # profile on again: the slot runs again
    assert home.calls == [20, 18, 20]
    await home.move(3)  # nothing duplicated by the next replanning
    assert home.calls == [20, 18, 20]
    await home.move(6)  # 20:30 the slot ends normally
    assert home.calls == [20, 18, 20, 18]


async def test_profile_switched_twice_in_the_same_slot(hass, hass_ws_client, freezer):
    """Each new activation in the slot gets its own run."""
    home = _Home(hass, freezer, _start())
    await home.setup(hass_ws_client, [(1, 6, 20, 18)])
    await home.move(1)
    for _ in range(2):
        await _profile(home, False)
        await _profile(home, True)
    assert home.calls == [20, 18, 20, 18, 20]
