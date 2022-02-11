<!--
SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
SPDX-License-Identifier: AGPL-3.0-only
-->
<div align="center">
  <h1>Carbonio Files UI</h1>
</div>

<div align="center">

  Files module for Zextras Carbonio

  [![Contributors][contributors-badge]][contributors]
  [![Activity][activity-badge]][activity]
  [![License][license-badge]](COPYING)
  [![Project][project-badge]][project]
  [![Twitter][twitter-badge]][twitter]

</div>

### How to build

#### Setup

- clone this repo
- init and update the submodule
```
git submodule init
git submodule update
```
- install the dependencies
```
npm install
```

#### Watch Mode

```
npm run start -- -h <host>
```

The host parameter is required to proxy requests and content from an existing Carbonio installation.

#### Build

```
npm run build
```

## License

Released under the AGPL-3.0-only license as specified here: [COPYING](COPYING).


[contributors-badge]: https://img.shields.io/github/contributors/zextras/carbonio-files-ui "Contributors"
[contributors]: https://github.com/zextras/carbonio-files-ui/graphs/contributors "Contributors"
[activity-badge]: https://img.shields.io/github/commit-activity/m/zextras/carbonio-files-ui "Activity"
[activity]: https://github.com/zextras/carbonio-files-ui/pulse "Activity"
[license-badge]: https://img.shields.io/badge/license-AGPL%203-green "License AGPL 3"
[project-badge]: https://img.shields.io/badge/project-carbonio-informational "Project Carbonio"
[project]: https://www.zextras.com/carbonio/ "Project Carbonio"
[twitter-badge]: https://img.shields.io/twitter/follow/zextras?style=social&logo=twitter "Follow on Twitter"
[twitter]: https://twitter.com/intent/follow?screen_name=zextras "Follow Zextras on Twitter"
