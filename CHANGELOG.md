# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.3.2](https://github.com/zextras/carbonio-files-ui/compare/v2.3.1...v2.3.2) (2023-09-29)


### Bug Fixes

* delete cached shares of children when changing shares of a folder ([c3c60b1](https://github.com/zextras/carbonio-files-ui/commit/c3c60b1d2baae8b2a93d1f55b10bc6a6ffff7433)), closes [#261](https://github.com/zextras/carbonio-files-ui/issues/261)

### [2.3.1](https://github.com/zextras/carbonio-files-ui/compare/v2.3.0...v2.3.1) (2023-09-11)

## [2.3.0](https://github.com/zextras/carbonio-files-ui/compare/v2.2.1...v2.3.0) (2023-08-31)


### Features

* add extension of new file inside input element ([73944c3](https://github.com/zextras/carbonio-files-ui/commit/73944c3656bc7d0dbef87ac09abd40b4970a2cfc)), closes [#255](https://github.com/zextras/carbonio-files-ui/issues/255)
* add preview action on right click on docs ([0d37249](https://github.com/zextras/carbonio-files-ui/commit/0d37249722f00174dd774704daef276c48946697)), closes [#256](https://github.com/zextras/carbonio-files-ui/issues/256)


### Bug Fixes

* align icons and prepare update of configs ([2beebe3](https://github.com/zextras/carbonio-files-ui/commit/2beebe3bed2c2ee6508f36de32780450c0b18d38)), closes [#239](https://github.com/zextras/carbonio-files-ui/issues/239) [#240](https://github.com/zextras/carbonio-files-ui/issues/240) [#241](https://github.com/zextras/carbonio-files-ui/issues/241) [#242](https://github.com/zextras/carbonio-files-ui/issues/242) [#243](https://github.com/zextras/carbonio-files-ui/issues/243) [#246](https://github.com/zextras/carbonio-files-ui/issues/246)
* avoid refetch after delete and update lint configs ([46ae623](https://github.com/zextras/carbonio-files-ui/commit/46ae62322837e103c3c4d0c30f1f8ee6739c8f4d)), closes [#247](https://github.com/zextras/carbonio-files-ui/issues/247)
* check if child is null beforw writing data in cache ([b2e6374](https://github.com/zextras/carbonio-files-ui/commit/b2e637455e4d58d4d96c9d11f459ebfffe89906a)), closes [#244](https://github.com/zextras/carbonio-files-ui/issues/244)
* fix animated upload icon not clickable during upload ([bcc7159](https://github.com/zextras/carbonio-files-ui/commit/bcc7159d4077d427f8ba7a5ef2000c5fa9332948)), closes [#250](https://github.com/zextras/carbonio-files-ui/issues/250)
* remove getParent query in favor of getPath ([2591d5c](https://github.com/zextras/carbonio-files-ui/commit/2591d5cfb89c2e622d5563c0534f35a156737a8f)), closes [#236](https://github.com/zextras/carbonio-files-ui/issues/236)
* update strings to improve coherence ([c5359c9](https://github.com/zextras/carbonio-files-ui/commit/c5359c96f7e7410cfa558cc59672e1aa5ebf05f0)), closes [#254](https://github.com/zextras/carbonio-files-ui/issues/254)
* update tests to use resolvers and revert current folder logic on folder selection modal ([f5c435f](https://github.com/zextras/carbonio-files-ui/commit/f5c435fe427f9675e0c3e9482286e2a62b49f9c8)), closes [#245](https://github.com/zextras/carbonio-files-ui/issues/245)
* upload from different module is not shown in list ([2f406de](https://github.com/zextras/carbonio-files-ui/commit/2f406de92da47e8a6d211d335c27d52d3a8f23bf))

### [2.2.1](https://github.com/zextras/carbonio-files-ui/compare/v2.2.0...v2.2.1) (2023-07-17)

## [2.2.0](https://github.com/zextras/carbonio-files-ui/compare/v2.1.1...v2.2.0) (2023-07-06)


### Features

* add alert icon when an upload fails ([5b22815](https://github.com/zextras/carbonio-files-ui/commit/5b22815df999f8d61528137e0dbd91d10e463606)), closes [#231](https://github.com/zextras/carbonio-files-ui/issues/231)
* add badge with the number of selected items ([034b23b](https://github.com/zextras/carbonio-files-ui/commit/034b23b00a5b9d9b050ab62e48f27db883ee95f6)), closes [#226](https://github.com/zextras/carbonio-files-ui/issues/226)
* add support for gif preview and thumbnail ([bbd6481](https://github.com/zextras/carbonio-files-ui/commit/bbd6481d7265ad979690924c369053c8d959cf71)), closes [#228](https://github.com/zextras/carbonio-files-ui/issues/228)
* change the upload badge to be a complete/total fraction ([a969fbc](https://github.com/zextras/carbonio-files-ui/commit/a969fbc7087f111b619a0a182bbedc5189707c5a)), closes [#219](https://github.com/zextras/carbonio-files-ui/issues/219)
* differentiate icons in the list with specific colors ([aa2ff95](https://github.com/zextras/carbonio-files-ui/commit/aa2ff9582114749924ef906e7773310837008f7c)), closes [#216](https://github.com/zextras/carbonio-files-ui/issues/216)


### Bug Fixes

* align home icons and root icons color inside modals ([19ce865](https://github.com/zextras/carbonio-files-ui/commit/19ce86543d187a0c50c660ba339f4c04e3e21fbd)), closes [#227](https://github.com/zextras/carbonio-files-ui/issues/227)
* save parent in cache with writeFragment when reading children ([073e0d5](https://github.com/zextras/carbonio-files-ui/commit/073e0d5f9baaa5cda3065f047e65b5148dcc04f0)), closes [#230](https://github.com/zextras/carbonio-files-ui/issues/230)

### [2.1.1](https://github.com/zextras/carbonio-files-ui/compare/v2.1.0...v2.1.1) (2023-06-05)

## [2.1.0](https://github.com/zextras/carbonio-files-ui/compare/v2.0.3...v2.1.0) (2023-05-25)


### Features

* update secondary bar order ([88d6e6d](https://github.com/zextras/carbonio-files-ui/commit/88d6e6de84dd4f8a103d08e994dfc8da3502d2bc)), closes [#210](https://github.com/zextras/carbonio-files-ui/issues/210)


### Bug Fixes

* fix avatar bug in dark and selecting mode ([fe7bbbf](https://github.com/zextras/carbonio-files-ui/commit/fe7bbbf51711a8759832bca1efcd1bea85769755)), closes [#211](https://github.com/zextras/carbonio-files-ui/issues/211)

### [2.0.3](https://github.com/zextras/carbonio-files-ui/compare/v2.0.2...v2.0.3) (2023-05-08)

### [2.0.2](https://github.com/zextras/carbonio-files-ui/compare/v2.0.1...v2.0.2) (2023-04-27)


### Bug Fixes

* add translation for share button ([4e18f66](https://github.com/zextras/carbonio-files-ui/commit/4e18f660eb1465663929ab41d700f8b0fb56af3a)), closes [#201](https://github.com/zextras/carbonio-files-ui/issues/201)
* replace click with onClick ([c0f5388](https://github.com/zextras/carbonio-files-ui/commit/c0f53889f6031f3ad42d62c500ecf723d162d02a)), closes [#203](https://github.com/zextras/carbonio-files-ui/issues/203)
* translate label for search module selector ([54191e9](https://github.com/zextras/carbonio-files-ui/commit/54191e97eb289786e896348fd745756aa91586d8)), closes [#200](https://github.com/zextras/carbonio-files-ui/issues/200)

### [2.0.1](https://github.com/zextras/carbonio-files-ui/compare/v2.0.0...v2.0.1) (2023-03-13)

## [2.0.0](https://github.com/zextras/carbonio-files-ui/compare/v1.1.1...v2.0.0) (2023-03-01)


### ⚠ BREAKING CHANGES

* remove 'files-select-nodes' integrated action

### Bug Fixes

* use click prop in chip input options ([25d47c7](https://github.com/zextras/carbonio-files-ui/commit/25d47c7cf9ae7db4f5b67f8a40a419d80a9df08e)), closes [#193](https://github.com/zextras/carbonio-files-ui/issues/193)


* remove click prop in favor of onClick ([3d329a4](https://github.com/zextras/carbonio-files-ui/commit/3d329a45a10b3ccbce5c2c9ea7867f37c2bc5380)), closes [#191](https://github.com/zextras/carbonio-files-ui/issues/191)

### [1.1.1](https://github.com/zextras/carbonio-files-ui/compare/v1.1.0...v1.1.1) (2023-02-13)

## [1.1.0](https://github.com/zextras/carbonio-files-ui/compare/v1.0.0...v1.1.0) (2023-02-02)


### Features

* add item type as advanced filter criteria ([b91df95](https://github.com/zextras/carbonio-files-ui/commit/b91df9549870d161b30a1a092db0c53963dc2280)), closes [#181](https://github.com/zextras/carbonio-files-ui/issues/181)
* add owner as advanced filter criteria  ([600f79b](https://github.com/zextras/carbonio-files-ui/commit/600f79b8d59fd1e220a4e86380265e5339bf2d2f)), closes [#180](https://github.com/zextras/carbonio-files-ui/issues/180)
* enable and disable carbonioFeatureFilesEnabled should show and hide Files Module ([79af589](https://github.com/zextras/carbonio-files-ui/commit/79af589e5ee2a957bcc6c6571087163929ef4271)), closes [#182](https://github.com/zextras/carbonio-files-ui/issues/182)

## [1.0.0](https://github.com/zextras/carbonio-files-ui/compare/v0.2.10...v1.0.0) (2023-01-16)

### [0.2.10](https://github.com/zextras/carbonio-files-ui/compare/v0.2.9...v0.2.10) (2023-01-10)


### Bug Fixes

* upload button not working on folders ([c4b580a](https://github.com/zextras/carbonio-files-ui/commit/c4b580a55af02cbda21eddb21d23d0e6a52f6abe))
* upload button not working on folders ([a27395f](https://github.com/zextras/carbonio-files-ui/commit/a27395f13d20e964d7bb847276a4640acf834915))

### [0.2.9](https://github.com/zextras/carbonio-files-ui/compare/v0.2.8...v0.2.9) (2023-01-05)


### Features

* upload folder from os ([a835d7e](https://github.com/zextras/carbonio-files-ui/commit/a835d7ed0a9588e0e27222f5b08b31402e8b3aee)), closes [#167](https://github.com/zextras/carbonio-files-ui/issues/167)

### [0.2.8](https://github.com/zextras/carbonio-files-ui/compare/v0.2.7...v0.2.8) (2022-12-05)


### Bug Fixes

* disable thumbnail for docs documents ([aefb0e2](https://github.com/zextras/carbonio-files-ui/commit/aefb0e20a829602dae21b2a0f51927bd9147d468)), closes [#162](https://github.com/zextras/carbonio-files-ui/issues/162)

### [0.2.7](https://github.com/zextras/carbonio-files-ui/compare/v0.2.6...v0.2.7) (2022-12-01)


### Bug Fixes

* fix typo in calc which is causing the broken ui in dev package ([3828860](https://github.com/zextras/carbonio-files-ui/commit/38288604af2deb0a0c1c148719f825056fe246c9))

### [0.2.6](https://github.com/zextras/carbonio-files-ui/compare/v0.2.5...v0.2.6) (2022-11-24)


### Features

* add destinationId in upload-to ([6dc8de7](https://github.com/zextras/carbonio-files-ui/commit/6dc8de706191ec26c0c9d295a258fb34ce39ad6b)), closes [#151](https://github.com/zextras/carbonio-files-ui/issues/151)

### [0.2.5](https://github.com/zextras/carbonio-files-ui/compare/v0.2.4...v0.2.5) (2022-11-15)


### Features

* convert px to rem ([dfd1328](https://github.com/zextras/carbonio-files-ui/commit/dfd13285a6d12bcb1d04aed7f374c005d3d5a3cd)), closes [#136](https://github.com/zextras/carbonio-files-ui/issues/136)
* disable force-cache to allow revalidation ([42be8eb](https://github.com/zextras/carbonio-files-ui/commit/42be8ebacafac298e061aec8c4233faaf5c830f8)), closes [#145](https://github.com/zextras/carbonio-files-ui/issues/145)


### Bug Fixes

* hide custom message input ([eb57784](https://github.com/zextras/carbonio-files-ui/commit/eb57784a1aaa5e4f9f874c992f22304506796d8c)), closes [#142](https://github.com/zextras/carbonio-files-ui/issues/142)
* update modals to restore spaces and fonts ([eb8ae08](https://github.com/zextras/carbonio-files-ui/commit/eb8ae0818e5f56fc2a62874fb576efc54190f5fb)), closes [#143](https://github.com/zextras/carbonio-files-ui/issues/143)

### [0.2.4](https://github.com/zextras/carbonio-files-ui/compare/v0.2.3...v0.2.4) (2022-11-08)

### [0.2.3](https://github.com/zextras/carbonio-files-ui/compare/v0.2.2...v0.2.3) (2022-10-27)


### Features

* add recents filter ([ba68f88](https://github.com/zextras/carbonio-files-ui/commit/ba68f880b45df8a5907f3c69da7793d5ae02bd66)), closes [#137](https://github.com/zextras/carbonio-files-ui/issues/137)

### [0.2.2](https://github.com/zextras/carbonio-files-ui/compare/v0.2.1...v0.2.2) (2022-10-17)


### Bug Fixes

* apply TabBar breaking change ([e98a931](https://github.com/zextras/carbonio-files-ui/commit/e98a931283e89abae25bb2197dd5455453a87361)), closes [#128](https://github.com/zextras/carbonio-files-ui/issues/128)
* compose modals with DS components and prevent overflowing on resize ([9c6ff41](https://github.com/zextras/carbonio-files-ui/commit/9c6ff412fb0524e0d9c3a3f3452bd1b1afd51de5)), closes [#129](https://github.com/zextras/carbonio-files-ui/issues/129)

### [0.2.1](https://github.com/zextras/carbonio-files-ui/compare/v0.2.0...v0.2.1) (2022-10-12)

## [0.2.0](https://github.com/zextras/carbonio-files-ui/compare/v0.1.10...v0.2.0) (2022-09-29)


### ⚠ BREAKING CHANGES

* migrate to @zextras/carbonio-design-system v0.4.0

### Features

* allow user to create different formats of documents ([dc5135c](https://github.com/zextras/carbonio-files-ui/commit/dc5135c407052068f9004612f4ca5a81c7137f05)), closes [#118](https://github.com/zextras/carbonio-files-ui/issues/118)
* integrate preview document selector ([3d9e70a](https://github.com/zextras/carbonio-files-ui/commit/3d9e70a79da6d4d4f280e619a193d60e0ee2e1ea)), closes [#122](https://github.com/zextras/carbonio-files-ui/issues/122)
* update new document action labels ([97584b8](https://github.com/zextras/carbonio-files-ui/commit/97584b863c91720290d5bb8cf618a7d97f1cb7b6)), closes [#120](https://github.com/zextras/carbonio-files-ui/issues/120)


### Bug Fixes

* avoid link chips to overflow and shrink buttons ([b94a04d](https://github.com/zextras/carbonio-files-ui/commit/b94a04d5ee305ba97b518e1ed3c0ce6eeb551b01)), closes [#126](https://github.com/zextras/carbonio-files-ui/issues/126)
* request shares from network when querying for more than cached limit ([e3aff4c](https://github.com/zextras/carbonio-files-ui/commit/e3aff4c4d2fe3d3645a8a4cd038730902dab2816)), closes [#124](https://github.com/zextras/carbonio-files-ui/issues/124)


* migrate to @zextras/carbonio-design-system v0.4.0 ([f8dcb93](https://github.com/zextras/carbonio-files-ui/commit/f8dcb93d01bb04c33c5d5528eeb48f9b878a9a0b)), closes [#115](https://github.com/zextras/carbonio-files-ui/issues/115)

### [0.1.10](https://github.com/zextras/carbonio-files-ui/compare/v0.1.9...v0.1.10) (2022-09-12)

### [0.1.9](https://github.com/zextras/carbonio-files-ui/compare/v0.1.8...v0.1.9) (2022-09-01)


### Features

* add getLinksInfo type to getLink integration function ([09979cf](https://github.com/zextras/carbonio-files-ui/commit/09979cfc6d991403413a24958969df3ca3142290)), closes [#96](https://github.com/zextras/carbonio-files-ui/issues/96)
* add tooltip on disabled actions on versions ([789d8c0](https://github.com/zextras/carbonio-files-ui/commit/789d8c048d285a96c39a9fae4ced8dd6bc3a81d0)), closes [#97](https://github.com/zextras/carbonio-files-ui/issues/97)
* add update-link ([15458bf](https://github.com/zextras/carbonio-files-ui/commit/15458bf8e9b06b8e432862b61e7c8eab2c819605)), closes [#95](https://github.com/zextras/carbonio-files-ui/issues/95)
* allow drop on opened folder during drag-move ([a361b43](https://github.com/zextras/carbonio-files-ui/commit/a361b43a048b9d9f69ab8d8574fa6aeeb67d6a70)), closes [#106](https://github.com/zextras/carbonio-files-ui/issues/106)
* implement collaboration link ([7778b60](https://github.com/zextras/carbonio-files-ui/commit/7778b602615bfd414bcd6f559fb02bd8dbc6de2b)), closes [#104](https://github.com/zextras/carbonio-files-ui/issues/104)
* improve chip of shares ([77fed99](https://github.com/zextras/carbonio-files-ui/commit/77fed99f4f7f2b39d8e8a34fb76dc658025f7254)), closes [#99](https://github.com/zextras/carbonio-files-ui/issues/99)
* wait for save result before closing dialog on unsaved changes ([8dbb759](https://github.com/zextras/carbonio-files-ui/commit/8dbb75921e665c56d61b01a9cf3f347f35056934)), closes [#107](https://github.com/zextras/carbonio-files-ui/issues/107)


### Bug Fixes

* align filter params by using a global constant ([557694a](https://github.com/zextras/carbonio-files-ui/commit/557694a59cf0f644e20146510cdd195d480b1432)), closes [#105](https://github.com/zextras/carbonio-files-ui/issues/105)

### [0.1.8](https://github.com/zextras/carbonio-files-ui/compare/v0.1.7...v0.1.8) (2022-08-01)

### [0.1.7](https://github.com/zextras/carbonio-files-ui/compare/v0.1.6...v0.1.7) (2022-07-21)


### Features

* add function for select-nodes integration ([2b57259](https://github.com/zextras/carbonio-files-ui/commit/2b57259491631aab135f587a34f901ec1537a3c3)), closes [#83](https://github.com/zextras/carbonio-files-ui/issues/83)
* add indicator for trashed nodes on search results ([b08e6a1](https://github.com/zextras/carbonio-files-ui/commit/b08e6a110f57912589b3f3e474141be50e722ceb)), closes [#86](https://github.com/zextras/carbonio-files-ui/issues/86)
* add limit to upload queue ([0105751](https://github.com/zextras/carbonio-files-ui/commit/0105751d4be5cc915d5713ca3b585f50297a20f4)), closes [#88](https://github.com/zextras/carbonio-files-ui/issues/88)
* add loader on thumbnail preview inside displayer ([da84c57](https://github.com/zextras/carbonio-files-ui/commit/da84c571f99a79214220241460d2e04498a470ec)), closes [#90](https://github.com/zextras/carbonio-files-ui/issues/90)
* allow creation of folders from nodes selection modal ([c2ad0f0](https://github.com/zextras/carbonio-files-ui/commit/c2ad0f03bfc7c91c0e147453a96dc8dbf96cf59f)), closes [#79](https://github.com/zextras/carbonio-files-ui/issues/79)
* open displayer with partial data and shim missing data ([7283cdc](https://github.com/zextras/carbonio-files-ui/commit/7283cdcf4e469ddb593b83d6cefa49cb4bca6bea)), closes [#87](https://github.com/zextras/carbonio-files-ui/issues/87)
* search by default in subfolders in advanced search ([b7ff09d](https://github.com/zextras/carbonio-files-ui/commit/b7ff09db0e0f05780d0e9ba0cca80f00bbf84e55)), closes [#85](https://github.com/zextras/carbonio-files-ui/issues/85)
* use contact groups in sharing feature ([de7786c](https://github.com/zextras/carbonio-files-ui/commit/de7786c0b30cf8946a2307faa3c42b48c8526b05)), closes [#84](https://github.com/zextras/carbonio-files-ui/issues/84)
* use RouteLeavingGuard on unsaved changes ([d857aae](https://github.com/zextras/carbonio-files-ui/commit/d857aae91c4c8016dff9c5f4c739df5726f85e61)), closes [#89](https://github.com/zextras/carbonio-files-ui/issues/89)


### Bug Fixes

* show preview for pdf with size 0 ([53c88f2](https://github.com/zextras/carbonio-files-ui/commit/53c88f2645d293b095a82b1ab67bba6ccbefe540)), closes [#80](https://github.com/zextras/carbonio-files-ui/issues/80)

### [0.1.6](https://github.com/zextras/carbonio-files-ui/compare/v0.1.5...v0.1.6) (2022-06-20)

### [0.1.5](https://github.com/zextras/carbonio-files-ui/compare/v0.1.4...v0.1.5) (2022-06-09)


### Features

* add in or under on search folder chip ([7ed8e85](https://github.com/zextras/carbonio-files-ui/commit/7ed8e8505dc4682104738b666c362446a00e1446)), closes [#68](https://github.com/zextras/carbonio-files-ui/issues/68)
* add integration to retrieve node metadata ([7d5569c](https://github.com/zextras/carbonio-files-ui/commit/7d5569ca834296ea186ebddf5be8d9e71238c925)), closes [#66](https://github.com/zextras/carbonio-files-ui/issues/66)
* handle limit of versions ([6ee16f1](https://github.com/zextras/carbonio-files-ui/commit/6ee16f1beb11ff9e4649bb2fe47431fb503a709c)), closes [#62](https://github.com/zextras/carbonio-files-ui/issues/62)


### Bug Fixes

* align behaviour of list on mutations updates ([51ae9f2](https://github.com/zextras/carbonio-files-ui/commit/51ae9f23b5626e7b0317645c7af26c61039a12b0)), closes [#75](https://github.com/zextras/carbonio-files-ui/issues/75)
* avoid to push on stack of modals on viewport change ([0f9b412](https://github.com/zextras/carbonio-files-ui/commit/0f9b412c3bc6c53b0a9bb16a0ac4daf29187367f)), closes [#64](https://github.com/zextras/carbonio-files-ui/issues/64)
* remove item from folder list when delete your own share ([2cfad03](https://github.com/zextras/carbonio-files-ui/commit/2cfad03e6eb739d3c2878a29af83f77743c68882)), closes [#63](https://github.com/zextras/carbonio-files-ui/issues/63)

### [0.1.4](https://github.com/zextras/carbonio-files-ui/compare/v0.1.3...v0.1.4) (2022-05-25)

### [0.1.3](https://github.com/zextras/carbonio-files-ui/compare/v0.1.2...v0.1.3) (2022-05-25)

### [0.1.2](https://github.com/zextras/carbonio-files-ui/compare/v0.1.1...v0.1.2) (2022-05-12)


### Features

* add preview on displayer ([96c5a4a](https://github.com/zextras/carbonio-files-ui/commit/96c5a4a613072ff8f2fac5223d105ba9dc5b99e1)), closes [#55](https://github.com/zextras/carbonio-files-ui/issues/55)


### Bug Fixes

* remove custom paddings from secondary bar items ([686b621](https://github.com/zextras/carbonio-files-ui/commit/686b62176d5bb36eea2ef7c80a26aa3839474f82)), closes [#58](https://github.com/zextras/carbonio-files-ui/issues/58)
* update secondary bar nested items indentation ([e5023d0](https://github.com/zextras/carbonio-files-ui/commit/e5023d0fd086b09ad4a9ca060be4e48e7b4f9f4f)), closes [#57](https://github.com/zextras/carbonio-files-ui/issues/57)
* use error policy all on getChildren and findNodes queries ([c13017d](https://github.com/zextras/carbonio-files-ui/commit/c13017d42dea056c73c92df5525ba3efd3018690)), closes [#56](https://github.com/zextras/carbonio-files-ui/issues/56)

### [0.1.1](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0...v0.1.1) (2022-05-09)


### Bug Fixes

* allow set of action label and icon for select nodes integration ([281236a](https://github.com/zextras/carbonio-files-ui/commit/281236a4058d485b8ae75b7d5ba57b00f80474e4))

## [0.1.0](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0-rc.6...v0.1.0) (2022-05-09)


### Features

* add thumbnails on list avatars ([4ad3f99](https://github.com/zextras/carbonio-files-ui/commit/4ad3f99c790d702958474c0cde674d7d38c9f63a)), closes [#36](https://github.com/zextras/carbonio-files-ui/issues/36)
* allow send via mail ([21faeed](https://github.com/zextras/carbonio-files-ui/commit/21faeed59ec6846a966925a3548dd13dac04d2de)), closes [#46](https://github.com/zextras/carbonio-files-ui/issues/46)
* get link function integration ([752d43d](https://github.com/zextras/carbonio-files-ui/commit/752d43dbe28021d2163f837a19ff22a0d6089e51)), closes [#40](https://github.com/zextras/carbonio-files-ui/issues/40)
* support preview of documents  ([dda77e1](https://github.com/zextras/carbonio-files-ui/commit/dda77e16db269d1f941a7ca18083403eea286449)), closes [#41](https://github.com/zextras/carbonio-files-ui/issues/41)


### Bug Fixes

* add check for folders in upload with drag and drop ([09f2a83](https://github.com/zextras/carbonio-files-ui/commit/09f2a834bc69a50c0d2195746d871178522af730)), closes [#42](https://github.com/zextras/carbonio-files-ui/issues/42)
* avoid to trigger a new request while the previous is still loading ([ca31427](https://github.com/zextras/carbonio-files-ui/commit/ca314278e3f61336f22ebc2dad4a5b35923bb43c)), closes [#45](https://github.com/zextras/carbonio-files-ui/issues/45)
* fix upload folder content in update unordered items case ([77aa886](https://github.com/zextras/carbonio-files-ui/commit/77aa8864520ada5fcdb455a38f922777f1d5089a)), closes [#39](https://github.com/zextras/carbonio-files-ui/issues/39)
* remove useless new actions on views unmount ([77a63af](https://github.com/zextras/carbonio-files-ui/commit/77a63af09a846264e24a0ce463d9ac7351041be3)), closes [#35](https://github.com/zextras/carbonio-files-ui/issues/35)
* set value of hidden params on search queries ([5f90b7b](https://github.com/zextras/carbonio-files-ui/commit/5f90b7b5a705c7bd0db70d7b37765be9bb99421b)), closes [#37](https://github.com/zextras/carbonio-files-ui/issues/37)

## [0.1.0-rc.6](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0-rc.5...v0.1.0-rc.6) (2022-04-13)


### Features

* implement pdf preview ([0c8daff](https://github.com/zextras/carbonio-files-ui/commit/0c8daffca69169501cd5138b6ef9e782901eef65)), closes [#23](https://github.com/zextras/carbonio-files-ui/issues/23)
* upload to target integrated function ([20fc60a](https://github.com/zextras/carbonio-files-ui/commit/20fc60aaa15fa217c168b6f6594ff7313ca8dc3b)), closes [#28](https://github.com/zextras/carbonio-files-ui/issues/28)


### Bug Fixes

* typo ([84d6e40](https://github.com/zextras/carbonio-files-ui/commit/84d6e406961168fd4c114f928ab6955b4cf0f269)), closes [#30](https://github.com/zextras/carbonio-files-ui/issues/30)

## [0.1.0-rc.5](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0-rc.4...v0.1.0-rc.5) (2022-04-01)


### Features

* create integration modal to select nodes ([86e68b3](https://github.com/zextras/carbonio-files-ui/commit/86e68b343497c4e985461e48670acdaf74827961)), closes [#17](https://github.com/zextras/carbonio-files-ui/issues/17)


### Bug Fixes

* remove shell references from common submodule ([27cf214](https://github.com/zextras/carbonio-files-ui/commit/27cf214591957919de56008e7b55ad01550b5188)), closes [#24](https://github.com/zextras/carbonio-files-ui/issues/24)

## [0.1.0-rc.4](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0-rc.3...v0.1.0-rc.4) (2022-03-24)


### Features

* add preview of images with previewer ([c9b6979](https://github.com/zextras/carbonio-files-ui/commit/c9b6979ecabaf220b7b4da2aaa0e5de5da362298)), closes [#19](https://github.com/zextras/carbonio-files-ui/issues/19)
* handle enter key on description input ([0146ec4](https://github.com/zextras/carbonio-files-ui/commit/0146ec45aec4e9038f0c6cdb767c1fbb17144365)), closes [#14](https://github.com/zextras/carbonio-files-ui/issues/14)


### Bug Fixes

* encode filename in base64 for upload request  ([391238b](https://github.com/zextras/carbonio-files-ui/commit/391238bdacb3a7506a18339e921becdbdea1de91)), closes [#18](https://github.com/zextras/carbonio-files-ui/issues/18)

## [0.1.0-rc.3](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0-rc.2...v0.1.0-rc.3) (2022-02-24)


### Bug Fixes

* fix edit public link expiration date  ([eacc9b2](https://github.com/zextras/carbonio-files-ui/commit/eacc9b2e8c7a0942fc07347a6b147e236230387b)), closes [#9](https://github.com/zextras/carbonio-files-ui/issues/9)

## [0.1.0-rc.2](https://github.com/zextras/carbonio-files-ui/compare/v0.1.0-rc.1...v0.1.0-rc.2) (2022-02-16)


### Features

* while decreasing your own share permission show a confirmation dialog ([b7049a2](https://github.com/zextras/carbonio-files-ui/commit/b7049a2e62543688a1fe3fc0db2b978c55a60598)), closes [#4](https://github.com/zextras/carbonio-files-ui/issues/4)


### Bug Fixes

* apply timezone where missing, edit description glitch and send mail integration ([f05d85f](https://github.com/zextras/carbonio-files-ui/commit/f05d85f9d44796ff8527b7c3f40c384bcbbd094e)), closes [#3](https://github.com/zextras/carbonio-files-ui/issues/3)
* fix navigation to trash and shared trash filter ([5a20896](https://github.com/zextras/carbonio-files-ui/commit/5a2089640b852f7e8f2836988bd781cd951b5dbb))

## 0.1.0-rc.1 (2022-02-11)


### Features

* first commit ([2571057](https://github.com/zextras/carbonio-files-ui/commit/2571057447a0ca1f7edbe2758270f5d905bd0634))
* first release commit ([8d20431](https://github.com/zextras/carbonio-files-ui/commit/8d20431ab214a008a9aae5c1301b815ef0afad23))
