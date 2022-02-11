# These are the commands used to add licenses to all files
# WARNING: it seems that the addheader command is not fully capable of replacing existing license headers
#  so be careful when running these commands.

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" -s 'css' ./src/**/*.jsx

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" -s 'css' ./src/**/*.tsx

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./src/**/*.js

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./__mocks__/**/*.js

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./src/**/*.ts

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./*.js

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./*.ts

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" --style 'python' ./src/**/*.graphql ./codegen.yml

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="CC-BY-NC-SA-4.0" --explicit-license ./src/**/*.svg

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" --explicit-license ./src/carbonio-files-ui-common/types/graphql/*

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./.eslintrc.js ./.prettierrc.js

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./CHANGELOG.md

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./src/carbonio-files-ui-common/README.md

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="CC0-1.0" ./.gitignore ./.gitmodules

reuse addheader --copyright="Zextras <https://www.zextras.com>" --license="AGPL-3.0-only" ./Jenkinsfile
