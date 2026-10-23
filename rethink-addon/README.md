# Home Assistant App: Rethink

Use your LG ThinQ appliances without needing the LG app or the LG cloud.

Rethink stands in for LG's cloud on your own network. Appliances connect to it
instead of LG's servers, and it publishes them to Home Assistant over MQTT
discovery, so they turn up as ordinary entities. It can optionally bridge them
back to the real cloud as well, so the official app keeps working.

Both ThinQ1 and ThinQ2 appliances are supported — air conditioners, fridges,
washers, dryers, ovens and more. The
[project README](https://github.com/anszom/rethink#supported-appliances) lists
the models known to work.

## What you need

- An MQTT broker — the same one the Home Assistant MQTT integration uses.
- A way to point LG's DNS names at your Home Assistant host.

The **Documentation** tab covers installation, options and ports. The
[project wiki](https://github.com/anszom/rethink/wiki) covers getting an
appliance to talk to rethink in the first place.

LG ThinQ is a trademark of LG, used here for identification only. This project
is not affiliated with LG and is provided WITHOUT ANY WARRANTY.
