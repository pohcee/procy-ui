<br>
<p align="center">
    <img src="./public/img/procy-hero.svg" alt="Procy: the clever raccoon sneaking a secure tunnel under a firewall to a server" width="100%">
</p>

<h1 align="center"> Procy UI <sup><em>alpha</em></sup> </h1>

<p align="center">
Manage remote systems with ease
</p>

<br/>

<p align="center">
    <a href="https://discord.gg/HQ4wMQmzcu"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
</p>

<p align="center">
    <img src="./public/procy-screenshot.png" alt="Procy screenshot" width="800" height="auto" />
</p>

# Procy UI

- [Website and documentation](https://procy.sh/docs/)
- [Procy server](https://github.com/pohcee/procy-server)

Welcome to the web UI of Procy, an open-source remote server manager without the hassle of VPNs. Procy takes its name from *Procyon callidus*, Latin for "the clever raccoon"; read the
[naming story](https://procy.sh/docs/#why-procy). This project is designed using Nuxt 3 to create a seamless and responsive user interface for managing remote systems securely.

## Getting started
---

### Install
```
git clone git@github.com:pohcee/procy-ui.git
cd procy-ui
yarn install
```


### Configuration

Start to fill out your env file. The most import variable is `NUXT_API_URL`
That should be the URL of your Procy server.

```
cp .env.example .env
yarn dev

```

#### Cors configuration

During the developement to allow cross-origin resource sharing (CORS) for all domains in the Procy server, you need to modify rportd.config file. This is useful because in development your front-end is on different domain than your back0end.

1. Open your `rportd.conf` file (path: `/etc/rport/rportd.conf`).
2. In the `[api]` section, locate or add the cors settings.
3. Update the setting to allow all origins by setting it to `*`:

```conf
[api]
# Other configurations

## Allowed origins for cross-origin requests.
cors = ["*"]

```

This configuration will enable requests from all domains, which is useful for development purposes. For production, it's recommended to specify a list of allowed domains or leave it empty.

4. Save the changes and restart the `rportd` service to apply the new configuration:
```bash
sudo systemctl restart rportd
```

### Credits
- Thanks to [Johan Cabeza](https://github.com/cryptodev4) for the great work on the design.
