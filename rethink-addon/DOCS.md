# Rethink

De-cloud LG ThinQ appliances and expose them to Home Assistant over MQTT,
without the official LG app or cloud. The app runs `rethink-cloud`, which
emulates the ThinQ cloud on your local network and translates the device
protocol into Home Assistant MQTT discovery.

## Requirements

- Home Assistant running in OS or Supervised mode
- An MQTT broker, which has to be the same one the Home Assistant MQTT
  integration uses. The
  [Mosquitto broker app](https://github.com/home-assistant/addons/tree/master/mosquitto)
  is the easiest option.
- A way to redirect the ThinQ DNS names to the Home Assistant host IP
  (e.g. your router's DNS, Pi-hole/AdGuard, or a local DNS override). See the
  [project wiki](https://github.com/anszom/rethink/wiki/Installing-rethink%E2%80%90cloud).
- Ability to listen on TCP ports 443 & 8883 on the host running Home Assistant.
  If these ports are already taken by other software, you will need to reconfigure
  that software, or use some kind of port-redirection/proxy approach (see
  Advanced setup below).

## Installation

1. Open Settings → Apps → App store in Home Assistant.
2. Add this custom repository: <https://github.com/anszom/rethink-ha>
3. Refresh the store and install Rethink.

## Configuration

The steps below document the most common configuration. For more detailed instructions, refer to [the project's wiki](https://github.com/anszom/rethink/wiki/Installing-rethink%E2%80%90cloud).

### 1. Set up the MQTT broker and Home Assistant MQTT integration

The most straightforward option is to use the [Mosquitto broker app](https://github.com/home-assistant/addons/tree/master/mosquitto).
If you set it up, it will be automatically picked up by rethink.

**NOTE**: this app binds to port 8883 by default, which conflicts with rethink. The simplest solution is to disable port 8883 on mosquitto.

Enable the MQTT integration in Home Assistant.

### 2. Configure the app

Open the app's Configuration tab. The minimal set of options for typical configurations is listed below.

| Option             | Default         | Description                                                                                                                                                      |
| ------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hostname`         | `rethink.lan`   | The DNS name your appliances are redirected to. Must be a name, not an IP, and must resolve by DNS — appliances do not do mDNS, so `.local` names will not work. |
| `mqtt_url`         | _(empty)_       | Leave blank if using the Mosquitto broker app. Otherwise, point it at your MQTT broker's URL, e.g. `mqtt://192.168.1.10:1883`.                                    |
| `mqtt_user`        | _(empty)_       | Username for the MQTT broker, needed only if using a custom `mqtt_url`.                                                                                          |
| `mqtt_pass`        | _(empty)_       | Password for the MQTT broker, needed only if using a custom `mqtt_url`.                                                                                          |

### 3. Start

Use the `Start` button on the app's `Info` page to start the app, then open the management panel with the `Open web UI` button. Any devices connected to rethink will show up there.

Congratulations! You're halfway there. Now you need to provision your devices to rethink.

## Device provisioning

The full instructions are available on [the project's wiki](https://github.com/anszom/rethink/wiki/Installing-rethink%E2%80%90cloud).
This section describes the common scenario.

### 1. Redirect DNS records

On a DNS serving your LAN, redirect `common.lgthinq.com` (ThinQ2) and `rethink.lgthinq.com` (ThinQ1) to your Home Assistant's IP. The first one
is only necessary at provisioning time, and may interfere with the operation of the official LG app, so it may be a good idea to remove
it afterwards. The ThinQ1 redirect must stay on all the time if you are using ThinQ1 devices.

### 2. Set up your device

#### Option A: using an Android device

1. Download the [companion app](https://github.com/anszom/rethink-setup-android/releases).
2. Connect to your home Wi-Fi and run "check DNS redirection" to make sure DNS redirection is set up properly.
3. Select "provision a device", enter your home Wi-Fi credentials and tap "next"
4. Enter wifi setup mode on your device (for the AC it's a two-key combo on the remote)
5. Connect to the Wi-Fi network offered by the device
6. The "start setup" button should activate, tap it to proceed with the provisioning.
7. The device will usually acknowledge the connection in some way (the AC beeps several times). Afterwards it will connect to your Wi-Fi network and `rethink`, assuming that you've configured everything correctly

#### Option B: using a Linux PC

1. Clone the [`rethink` repo](https://github.com/anszom/rethink) on your Wi-Fi-capable Linux machine and run `npm install` in it.
2. Enter wifi setup mode on your device (for the AC it's a two-key combo on the remote)
3. Connect to the Wi-Fi network offered by the device
4. Run `npx tsx rethink-setup.ts 192.168.120.254 YOUR_SSID YOUR_PASSWORD`
5. The device will usually acknowledge the connection in some way (the AC beeps several times). Afterwards it will connect to your Wi-Fi network and `rethink`, assuming that you've configured everything correctly

### 3. Done!

Your device should appear in the rethink management panel. If the device uses a supported protocol, it will
be automatically translated to Home Assistant and show up in your dashboard.

## Bridge mode

Bridge mode re-registers your appliances with the real LG cloud and proxies
traffic to it, so the official ThinQ app keeps working alongside Home
Assistant. To activate the function, go to the management panel and link
your LG account under **Bridge mode**. Logging out disables it again for every appliance.

Once an account is linked, each appliance has its own switch in the device
list, so you can bridge some and not others.

## Advanced setup

### Logging

The `log` option is a free-form list of topics, because device drivers add
topics of their own and any fixed list here would go stale. The topics the
app itself uses are:

| Topic      | What it prints                                             |
| ---------- | ---------------------------------------------------------- |
| `status`   | Startup, configuration and connection state. Keep this on. |
| `incoming` | Messages received from appliances.                         |
| `outgoing` | Messages sent to appliances.                               |
| `publish`  | MQTT discovery and state published to Home Assistant.      |
| `HTTPS`    | Requests to the device-facing HTTP/HTTPS servers.          |
| `MGMT`     | Management web interface activity.                         |
| `bridge`   | ThinQ cloud bridge and LG account login.                   |

Individual device drivers log under their own model ID, for example
`WFV474PGV`, which is useful when reverse-engineering one appliance without
drowning in traffic from the others. `all` enables everything.

### Ports

The app exposes the device-facing ports below. Appliances connect to the
Home Assistant host on these.

| Port        | Purpose                            |
| ----------- | ---------------------------------- |
| `443/tcp`   | ThinQ2 HTTPS (device provisioning) |
| `8883/tcp`  | ThinQ2 MQTTS (device connection)   |
| `46030/tcp` | ThinQ1 HTTPS (device provisioning) |
| `47878/tcp` | ThinQ1 device connection           |

Appliances expect the standard ports, so leave these alone if you can. If
something else on the host already holds 443 or 8883, remap the host side in
the app's **Network** panel and then tell rethink what the appliances will
actually reach, otherwise it keeps directing them at the port it binds:

- `https_advertise: 443` — the appliances reach port 443 and something (your
  router, a firewall rule, a proxy) forwards to the host port you picked.
- `https_advertise: https://rethink.lan:443` — a full URL, for a reverse proxy
  in front of rethink. The proxy's certificate must chain to rethink's CA, or
  a custom CA certificate must be supplied
- `mqtts_advertise` takes `ssl://host:port` in the same way, and needs plain
  TCP/TLS-with-SNI forwarding rather than an HTTP proxy.

Leave both empty when the host ports are mapped one-to-one.

### A hand-written configuration file

The options exposed in Home Assistant cover the common cases. For anything else —
binding an unencrypted listener, per-interface bind addresses, ThinQ1 port overrides —
you can supply a full `rethink-cloud` configuration file instead.

On every start the app writes `config.jsonc.example` into its data directory,
containing the configuration your current options produce. Copy it to a name of your
own, edit it, and set `config_file` to that name. Comments are allowed.

The file paths in it are written out in full, so a copy keeps using the app
data directory for whatever you do not override — you can point `ca_key_file`
at your own CA while leaving the bridge state where it is.

### Data & persistence

The app maps its `addon_config` directory to `/app/data` (read-write), so
everything below survives restarts and updates:

- `ca.key` / `ca.cert` — the CA the app generates on first run for your
  `hostname`.
- `config.jsonc.example` — rewritten on every start from your current options,
  as a starting point for `config_file`. It is not read back.
- `state/` — bridge mode state. The directory exists whether or not an LG
  account is linked.

From outside the container the same directory is `/addon_configs/<slug>`,
reachable over the Samba or SSH apps. That is where `config_file` paths are
resolved, so put a hand-written configuration file there.

## Notes

LG ThinQ is a trademark of LG and is used here for identification only. This
project is not affiliated with LG. It is provided WITHOUT ANY WARRANTY.
