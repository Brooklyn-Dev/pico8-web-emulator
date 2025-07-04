# Web PICO-8 Emulator / Runtime

![License](https://img.shields.io/badge/license-MIT-green)
![GitHub issues](https://img.shields.io/github/issues/Brooklyn-Dev/pico8-web-emulator)

<table>
<tr>
<td style="vertical-align: top; max-width: 550px;">
A web-based PICO-8 cartridge emulator built with JavaScript and Fengari.
<br><br>
Currently supports loading two preset `.p8.png` demo cartridges.
</td>
<td>
    <a href="https://shipwrecked.hackclub.com/?t=ghrm" target="_blank">
        <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png" alt="Shipwrecked badge" style="max-width: 250px;">
    </a>
</td>
</tr>
</table>

![Screenshot](screenshot.jpg)

## Features

-   Extracts hidden game data from `.p8.png` cartridge images
-   Transpiles PICO-8 Lua syntax into valid Lua code for execution
-   Runs game logic in browser using Fengari Lua VM
-   Implements core PICO-8 API functions
-   Supports keyboard inputs mapped to PICO-8 buttons
-   Cartridge selection UI

## Usage

-   Go to the website and select a cartridge to load.
    -   ⚠️ To ensure cartridges load properly, please disable browser shields or privacy settings that block image/script loading.
-   Limited functionality at this time. I plan to continue improving this beyond the minimum project requirements. Originally intended to support Celeste Classic or other full PICO-8 games, but underestimated how hard this would be.

## Future Improvements

-   Support larger games like Celeste Classic
-   Allow uploading custom cartridges
-   Add mobile support
-   Add music and sound effects support

## Cartridge Files Hosting

The `.p8.png` cartridge files are hosted separately on a static file server: [https://brooklyn-dev-pico-8-cartridges.netlify.app/](https://brooklyn-dev-pico-8-cartridges.netlify.app/)

The web emulator loads cartridges from this external source.

Due to file corruption issues when hosting cartridges on Vercel or GitHub, the cartridge files are hosted externally to ensure proper loading.

## Credits

See the [Credits](CREDITS.md) for more information about the cartridge files and attribution.

-   Implementation inspired by - [PICO-8 Wiki](https://pico-8.fandom.com/wiki/Pico-8_Wikia)
-   Demo cartridges provided by - [PICO-8 Educational Edition](https://www.pico-8-edu.com/)

## Like this project?

If you find this project interesting or useful, consider giving it a star ⭐️!

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more information.
